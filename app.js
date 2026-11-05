'use strict';
const $ = (id) => document.getElementById(id);
const video = $('video');
const canvas = $('captureCanvas');
const presets = {classic:{contrast:100,brightness:100},soft:{contrast:80,brightness:110},punchy:{contrast:140,brightness:100},noir:{contrast:170,brightness:85}};
const defaults = {preset:'classic',contrast:100,brightness:100,grid:true,format:'image/jpeg',quality:90,autoSave:true};
function storedSettings(){try{const result=JSON.parse(localStorage.getItem('monochrome-settings')||'{}');return {...defaults,...result}}catch{return {...defaults}}}
let config=storedSettings();
let lastPhotoSaved=false;let stream=null, devices=[], currentDeviceId=null, facing='environment', cameraBusy=false, photoBusy=false, currentPhoto=null, lastPhoto=null, dbPromise=null, objectUrls=new Set(), galleryAvailable=true, currentPhotoSaved=false;
const photoMime = (blob) => blob.type === 'image/png' ? 'png' : 'jpg';
const fmtDate = (time) => new Date(time).toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});
let toastTimer;
function toast(message){const el=$('toast');el.textContent=message;el.classList.add('visible');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('visible'),3500)}
function persist(){try{localStorage.setItem('monochrome-settings',JSON.stringify(config))}catch{/* private mode */}}
function updateFilter(){const filter=`grayscale(1) contrast(${config.contrast}%) brightness(${config.brightness}%)`;video.style.filter=filter;$('contrastValue').textContent=config.contrast+'%';$('brightnessValue').textContent=config.brightness+'%';$('contrast').value=config.contrast;$('brightness').value=config.brightness;$('presetChip').textContent=config.preset.toUpperCase();document.querySelectorAll('[data-preset]').forEach(btn=>{const on=btn.dataset.preset===config.preset;btn.classList.toggle('is-selected',on);btn.setAttribute('aria-pressed',String(on))});persist()}
function updateGrid(){$('gridOverlay').hidden=!config.grid;$('gridChip').textContent=config.grid?'GRID ON':'GRID OFF';$('gridToggle').checked=config.grid;persist()}
function updateSettings(){$('formatSelect').value=config.format;$('quality').value=config.quality;$('qualityValue').textContent=config.quality+'%';$('qualitySetting').hidden=config.format==='image/png';$('autoSave').checked=config.autoSave;updateFilter();updateGrid()}
function stateCamera(message,detail,button='Enable camera'){$('cameraEmpty').hidden=false;$('cameraTitle').textContent=message;$('cameraMessage').textContent=detail;$('startCamera').textContent=button;$('liveText').textContent='CAMERA OFF';$('liveChip').classList.remove('is-live');$('snap').disabled=true;$('switch').disabled=true;$('resolutionLabel').textContent='B&W'}
function stopCamera(){if(stream){stream.getTracks().forEach(t=>t.stop());stream=null}video.srcObject=null}
async function findDevices(){try{devices=(await navigator.mediaDevices.enumerateDevices()).filter(d=>d.kind==='videoinput')}catch{devices=[]}$('switch').disabled=!stream || (devices.length<2 && !('facingMode' in (stream?.getVideoTracks()[0]?.getSettings()||{})))}
async function startCamera(deviceId){if(cameraBusy)return;cameraBusy=true;$('startCamera').disabled=true;$('switch').disabled=true;$('snap').disabled=true;
 try{
  if(!window.isSecureContext || !navigator.mediaDevices?.getUserMedia){throw new Error(!window.isSecureContext?'This page must use HTTPS or localhost to access the camera.':'Camera access is not supported by this browser.')}
  stopCamera();
  let next;
  const base={width:{ideal:1920},height:{ideal:1080}};
  try{next=await navigator.mediaDevices.getUserMedia({audio:false,video:deviceId?{...base,deviceId:{exact:deviceId}}:{...base,facingMode:{ideal:facing}}})}
  catch(error){if(deviceId && (error.name==='OverconstrainedError'||error.name==='NotFoundError'))next=await navigator.mediaDevices.getUserMedia({audio:false,video:{...base,facingMode:{ideal:facing}}});else throw error}
  stream=next;video.srcObject=stream;await video.play();
  await findDevices();const settings=stream.getVideoTracks()[0]?.getSettings()||{};currentDeviceId=settings.deviceId||deviceId||null;if(settings.facingMode)facing=settings.facingMode;
  $('cameraEmpty').hidden=true;$('liveText').textContent='LIVE PREVIEW';$('liveChip').classList.add('is-live');$('snap').disabled=false;$('resolutionLabel').textContent=video.videoWidth && video.videoHeight ? `${video.videoWidth} × ${video.videoHeight}`:'B&W';$('cameraHelp').textContent='Ready to capture. Photos stay on your device.';
  stream.getVideoTracks()[0]?.addEventListener('ended',()=>{if(stream===next){stopCamera();stateCamera('Camera disconnected','Reconnect your camera and try again.','Try again')}});
 }catch(error){stopCamera();let detail='Check your camera connection and try again.';if(error.name==='NotAllowedError'||error.name==='PermissionDeniedError')detail='Camera permission was denied. Allow access in your browser site settings, then try again.';else if(error.name==='NotReadableError')detail='The camera may be in use by another app. Close it and try again.';else if(error.name==='NotFoundError')detail='No camera was detected on this device.';else if(error.message)detail=error.message;stateCamera('Camera unavailable',detail,'Try again');toast('Camera could not start')}
 finally{cameraBusy=false;$('startCamera').disabled=false;await findDevices()}}
async function switchCamera(){if(!stream||cameraBusy)return;let target=null;const idx=devices.findIndex(d=>d.deviceId===currentDeviceId);if(devices.length>1)target=devices[(idx+1+devices.length)%devices.length].deviceId;else facing=facing==='environment'?'user':'environment';await startCamera(target)}
function filenameFor(photo){const date=new Date(photo.created);const pad=n=>String(n).padStart(2,'0');return `monochrome_${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}_${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}.${photoMime(photo.blob)}`}
function photoURL(blob){const url=URL.createObjectURL(blob);objectUrls.add(url);return url}
function revokeUrls(){for(const url of objectUrls)URL.revokeObjectURL(url);objectUrls.clear()}
function download(photo){if(!photo)return;const url=photoURL(photo.blob);const a=document.createElement('a');a.href=url;a.download=filenameFor(photo);document.body.appendChild(a);a.click();a.remove();setTimeout(()=>{URL.revokeObjectURL(url);objectUrls.delete(url)},30000);toast('Photo download requested')}
async function capture(){if(!stream||photoBusy||!video.videoWidth)return toast('Camera is not ready');photoBusy=true;$('snap').disabled=true;
 try{canvas.width=video.videoWidth;canvas.height=video.videoHeight;const ctx=canvas.getContext('2d',{willReadFrequently:false});ctx.filter=`grayscale(1) contrast(${config.contrast}%) brightness(${config.brightness}%)`;ctx.drawImage(video,0,0,canvas.width,canvas.height);const blob=await new Promise((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Photo could not be encoded')),config.format,config.quality/100));const photo={id:`${Date.now()}-${Math.random().toString(36).slice(2,9)}`,created:Date.now(),blob,width:canvas.width,height:canvas.height};currentPhoto=photo;currentPhotoSaved=false;lastPhoto=photo;lastPhotoSaved=false;setThumbnail(photo);if(config.autoSave){try{await savePhoto(photo);currentPhotoSaved=true;lastPhotoSaved=true;await refreshGalleryCount();toast('Photo saved to local gallery')}catch(e){toast('Gallery storage unavailable — download your photo')}}else toast('Photo captured — download to keep it');openReview(photo)}catch(e){toast('Unable to capture photo. Please try again.');console.error(e)}finally{photoBusy=false;$('snap').disabled=!stream}}
function setThumbnail(photo){const img=$('lastPhotoImage');const old=img.dataset.url;if(old){URL.revokeObjectURL(old);objectUrls.delete(old)}if(!photo){img.hidden=true;$('thumbnailPlaceholder').hidden=false;return}const url=photoURL(photo.blob);img.dataset.url=url;img.src=url;img.hidden=false;$('thumbnailPlaceholder').hidden=true}
function openReview(photo, saved=currentPhotoSaved){currentPhoto=photo;currentPhotoSaved=saved;const img=$('reviewImage');if(img.dataset.url){URL.revokeObjectURL(img.dataset.url);objectUrls.delete(img.dataset.url)}const url=photoURL(photo.blob);img.src=url;img.dataset.url=url;$('reviewInfo').textContent=`${fmtDate(photo.created)} · ${photo.width} × ${photo.height} · ${photoMime(photo.blob).toUpperCase()}`;$('deleteReview').hidden=!currentPhotoSaved;openDialog('reviewDialog')}
function openDialog(id){const dialog=$(id);if(!dialog.open)dialog.showModal()}
function openDB(){if(!('indexedDB' in window))return Promise.reject(new Error('IndexedDB unsupported'));if(!dbPromise)dbPromise=new Promise((resolve,reject)=>{const request=indexedDB.open('monochrome-gallery',1);request.onupgradeneeded=()=>{const db=request.result;if(!db.objectStoreNames.contains('photos'))db.createObjectStore('photos',{keyPath:'id'})};request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error)}).catch(err=>{dbPromise=null;throw err});return dbPromise}
async function dbTask(mode,callback){const db=await openDB();return new Promise((resolve,reject)=>{const tx=db.transaction('photos',mode),store=tx.objectStore('photos');let result;tx.oncomplete=()=>resolve(result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||new Error('Database transaction aborted'));try{const req=callback(store);req.onsuccess=()=>{result=req.result}}catch(e){reject(e)}})}
const savePhoto=(photo)=>dbTask('readwrite',store=>store.put(photo));
const listPhotos=()=>dbTask('readonly',store=>store.getAll()).then(photos=>photos.sort((a,b)=>b.created-a.created));
const removePhoto=(id)=>dbTask('readwrite',store=>store.delete(id));
async function refreshGalleryCount(){try{const photos=await listPhotos();galleryAvailable=true, currentPhotoSaved=false;$('galleryCount').hidden=photos.length===0;return photos}catch{galleryAvailable=false;$('galleryCount').hidden=true;return []}}
async function openGallery(){openDialog('galleryDialog');const grid=$('galleryGrid');grid.replaceChildren();$('galleryEmpty').hidden=true;const photos=await refreshGalleryCount();if(!photos.length){$('galleryEmpty').hidden=false;$('galleryEmpty').textContent=galleryAvailable?'No photos yet. Take one to see it here.':'Gallery storage is not available in this browser.';return}photos.forEach(photo=>{const button=document.createElement('button');button.type='button';button.className='gallery-item';button.setAttribute('aria-label',`View photograph from ${fmtDate(photo.created)}`);const img=document.createElement('img');img.alt='';img.loading='lazy';img.src=photoURL(photo.blob);button.appendChild(img);button.addEventListener('click',()=>{$('galleryDialog').close();openReview(photo,true)});grid.appendChild(button)})}
function cleanupGallery(){const grid=$('galleryGrid');for(const img of grid.querySelectorAll('img')){if(img.src.startsWith('blob:')){URL.revokeObjectURL(img.src);objectUrls.delete(img.src)}}grid.replaceChildren()}
async function deleteCurrent(){if(!currentPhoto)return;const photo=currentPhoto;if(!confirm('Delete this photo from your local gallery?'))return;try{await removePhoto(photo.id);if(lastPhoto?.id===photo.id){const photos=await refreshGalleryCount();lastPhoto=photos[0]||null;lastPhotoSaved=!!lastPhoto;setThumbnail(lastPhoto)}else await refreshGalleryCount();$('reviewDialog').close();toast('Photo deleted')}catch{toast('Unable to delete this photo')}}
// Events
$('startCamera').addEventListener('click',()=>startCamera());$('snap').addEventListener('click',capture);$('switch').addEventListener('click',switchCamera);
$('settingsOpen').addEventListener('click',()=>openDialog('settingsDialog'));$('galleryOpen').addEventListener('click',openGallery);$('lastPhoto').addEventListener('click',()=>lastPhoto?openReview(lastPhoto,lastPhotoSaved):openGallery());
$('downloadReview').addEventListener('click',()=>download(currentPhoto));$('deleteReview').addEventListener('click',deleteCurrent);
document.querySelectorAll('[data-close]').forEach(btn=>btn.addEventListener('click',()=>$(btn.dataset.close).close()));
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close()}));$('galleryDialog').addEventListener('close',cleanupGallery);
document.querySelectorAll('[data-preset]').forEach(btn=>btn.addEventListener('click',()=>{config.preset=btn.dataset.preset;Object.assign(config,presets[config.preset]);updateFilter()}));
for(const name of ['contrast','brightness'])$(name).addEventListener('input',e=>{config[name]=Number(e.target.value);config.preset='custom';updateFilter()});
$('resetLook').addEventListener('click',()=>{config.preset='classic';Object.assign(config,presets.classic);updateFilter();toast('Look reset')});
$('gridToggle').addEventListener('change',e=>{config.grid=e.target.checked;updateGrid()});
$('formatSelect').addEventListener('change',e=>{config.format=e.target.value;updateSettings()});
$('quality').addEventListener('input',e=>{config.quality=Number(e.target.value);updateSettings()});
$('autoSave').addEventListener('change',e=>{config.autoSave=e.target.checked;persist()});
if(navigator.mediaDevices?.addEventListener)navigator.mediaDevices.addEventListener('devicechange',findDevices);
window.addEventListener('pagehide',()=>{stopCamera();revokeUrls()});
function refreshTheme(){const dark=window.matchMedia('(prefers-color-scheme: dark)').matches;$('theme-color').content=dark?'#111116':'#f5f3f8'}
const themeQuery=window.matchMedia('(prefers-color-scheme: dark)');themeQuery.addEventListener?.('change',refreshTheme);refreshTheme();updateSettings();refreshGalleryCount().then(async photos=>{if(photos.length){lastPhoto=photos[0];lastPhotoSaved=true;setThumbnail(lastPhoto)}});
if('serviceWorker' in navigator && window.isSecureContext)window.addEventListener('load',()=>navigator.serviceWorker.register('./service-worker.js').catch(err=>console.warn('Offline mode unavailable:',err)));
// Request permission only after a user action, avoiding surprise browser permission prompts.
