/* =============================================
   ✦  LAGU YANG DISUKAI — Music Player
   ─────────────────────────────────────────────
   Cara menambah lagu:
   Tambahkan objek baru ke array `songs` di bawah.
   Setiap lagu perlu:
     title  — judul lagu
     artist — nama artis
     cover  — path gambar cover, mis: "covers/lagu1.jpg"
              (kosongkan "" untuk gambar placeholder)
     file   — path file audio, mis: "music/lagu1.mp3"

   Contoh:
   { title: "Nama Lagu", artist: "Nama Artis", cover: "covers/img.jpg", file: "music/audio.mp3" },
   ============================================= */

/* =============================================
   DAFTAR LAGU — Edit di sini
   ============================================= */
const songs = [
  {
    title:  "Midnight Glow",
    artist: "Neon Archipelago",
    cover:  "",
    file:   "music/song1.mp3"
  },
  {
    title:  "Langit Biru Jakarta",
    artist: "Ardian Syah",
    cover:  "",
    file:   "music/song2.mp3"
  },
  {
    title:  "Quantum Drift",
    artist: "Static Wave",
    cover:  "",
    file:   "music/song3.mp3"
  },
  {
    title:  "Rindu yang Membiru",
    artist: "Dira Maharani",
    cover:  "",
    file:   "music/song4.mp3"
  },
  {
    title:  "Deep Ocean Signal",
    artist: "The Coral Ensemble",
    cover:  "",
    file:   "music/song5.mp3"
  },
  {
    title:  "Senja di Selatan",
    artist: "Rio Santosa",
    cover:  "",
    file:   "music/song6.mp3"
  }
];
/* ─── Akhir daftar lagu ─── */


/* =============================================
   STATE
   ============================================= */
let currentIdx   = 0;       // indeks lagu aktif
let isPlaying    = false;
let isShuffle    = false;
let repeatMode   = 0;       // 0=off 1=repeat-all 2=repeat-one
let isLiked      = false;
let volumeLevel  = 0.8;

let shuffleQueue = [];
let shufflePos   = 0;

// Web Audio
let audioCtx, analyser, sourceNode, dataArray, animRaf;
let audioContextStarted = false;

// DOM refs — cached once
const audio         = document.getElementById('audio');
const screenHome    = document.getElementById('screen-home');
const screenPlayer  = document.getElementById('screen-player');
const miniPlayer    = document.getElementById('mini-player');
const songList      = document.getElementById('song-list');
const heroGrid      = document.getElementById('hero-grid');
const playlistCount = document.getElementById('playlist-count');
const progressTrack = document.getElementById('progress-track');
const progressFill  = document.getElementById('progress-fill');
const mpFill        = document.getElementById('mini-progress-fill');
const timeCurrent   = document.getElementById('time-current');
const timeTotal     = document.getElementById('time-total');
const volumeTrack   = document.getElementById('volume-track');
const volumeFill    = document.getElementById('volume-fill');
const volumeThumb   = document.getElementById('volume-thumb');
const playerBgColor = document.getElementById('player-bg-color');
const playerCoverGlow = document.getElementById('player-cover-glow');
const glowOrb       = document.getElementById('glow-orb');

// Canvases
const canvasFull = document.getElementById('visualizer-full');
const ctxFull    = canvasFull.getContext('2d');
const canvasMini = document.getElementById('visualizer-mini');
const ctxMini    = canvasMini.getContext('2d');


/* =============================================
   INIT
   ============================================= */
function init() {
  buildHeroGrid();
  buildSongList();
  updatePlaylistCount();
  loadSong(0, false);
  initVolumeFromLevel();
  startParticles();
  startVisualizer();
  attachEvents();
}


/* =============================================
   HERO GRID (4 cover thumbnails)
   ============================================= */
function buildHeroGrid() {
  heroGrid.innerHTML = '';
  const picks = songs.slice(0, 4);

  // Fill to 4 slots even if fewer songs
  while (picks.length < 4) picks.push(null);

  picks.forEach(song => {
    const div = document.createElement('div');
    div.className = 'hero-thumb';

    if (song && song.cover) {
      const img = document.createElement('img');
      img.src   = song.cover;
      img.alt   = song.title || '';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;';
      img.onerror = () => { img.replaceWith(placeholderThumb()); };
      div.appendChild(img);
    } else {
      div.appendChild(placeholderThumb());
    }
    heroGrid.appendChild(div);
  });
}

function placeholderThumb() {
  const d = document.createElement('div');
  d.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#1a1a35,#2a1555)';
  d.innerHTML = '<svg width="28" height="28" viewBox="0 0 24 24" fill="rgba(255,255,255,0.15)"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>';
  return d;
}

function updatePlaylistCount() {
  const n = songs.length;
  playlistCount.textContent = `${n} lagu`;
}


/* =============================================
   SONG LIST
   ============================================= */
function buildSongList() {
  songList.innerHTML = '';
  songs.forEach((song, i) => {
    const item = document.createElement('div');
    item.className = 'song-item';
    item.id        = `song-${i}`;
    item.style.animationDelay = `${i * 0.04}s`;
    item.innerHTML = `
      <div class="song-cover">
        ${coverHTML(song, i)}
        <div class="cover-eq">
          <span></span><span></span><span></span><span></span>
        </div>
      </div>
      <div class="song-info">
        <div class="song-title">${esc(song.title)}</div>
        <div class="song-artist">
          <span class="song-number">${i + 1}</span>
          <span class="song-dot">·</span>
          ${esc(song.artist)}
        </div>
      </div>
      <button class="btn-song-menu" aria-label="Opsi" onclick="event.stopPropagation()">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/></svg>
      </button>
    `;
    item.addEventListener('click', () => selectSong(i, true));
    songList.appendChild(item);
  });
}

function coverHTML(song, i) {
  if (song.cover) {
    return `<img src="${esc(song.cover)}" alt="${esc(song.title)}"
              onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"
            />
            <div class="song-cover-placeholder" style="display:none">
              <svg viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>
            </div>`;
  }
  return `<div class="song-cover-placeholder">
    <svg viewBox="0 0 24 24"><path d="M12 3v10.55A4 4 0 1 0 14 17V7h4V3h-6z"/></svg>
  </div>`;
}

function esc(str) {
  return String(str || '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function highlightSong(idx) {
  document.querySelectorAll('.song-item').forEach((el, i) => {
    el.classList.toggle('active', i === idx);
    el.classList.toggle('is-playing', i === idx && isPlaying);
    if (i === idx) el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  });
}


/* =============================================
   LOAD SONG
   ============================================= */
function loadSong(idx, autoPlay) {
  currentIdx = idx;
  const song = songs[idx];
  if (!song) return;

  // Audio source
  audio.src = song.file;
  audio.load();

  // Player screen info
  document.getElementById('player-title').textContent  = song.title;
  document.getElementById('player-artist').textContent = song.artist;
  document.getElementById('mini-title').textContent   = song.title;
  document.getElementById('mini-artist').textContent  = song.artist;

  // Covers
  updateCovers(song);

  // Reset progress
  progressFill.style.width = '0%';
  mpFill.style.width       = '0%';
  timeCurrent.textContent  = '0:00';
  timeTotal.textContent    = '0:00';

  // Highlight list
  highlightSong(idx);

  // Show mini player
  miniPlayer.classList.remove('hidden');

  if (autoPlay) playAudio();
  else pauseState();
}

function updateCovers(song) {
  const playerImg   = document.getElementById('player-cover-img');
  const playerPhld  = document.getElementById('player-cover-placeholder');
  const miniImg     = document.getElementById('mini-cover-img');
  const miniPhld    = document.getElementById('mini-cover-placeholder');

  if (song.cover) {
    playerImg.src          = song.cover;
    playerImg.style.display = 'block';
    playerPhld.style.display = 'none';
    miniImg.src             = song.cover;
    miniImg.style.display   = 'block';
    miniPhld.style.display  = 'none';
  } else {
    playerImg.style.display  = 'none';
    playerPhld.style.display = 'flex';
    miniImg.style.display    = 'none';
    miniPhld.style.display   = 'flex';
  }

  // Extract dominant color for dynamic glow
  if (song.cover) extractColorFromCover(song.cover);
  else applyGlowColor('30,80,160');
}


/* =============================================
   DYNAMIC GLOW — extract color from cover
   ============================================= */
function extractColorFromCover(src) {
  const img = new Image();
  img.crossOrigin = 'anonymous';
  img.src = src;
  img.onload = () => {
    try {
      const c  = document.createElement('canvas');
      c.width  = 32; c.height = 32;
      const x  = c.getContext('2d');
      x.drawImage(img, 0, 0, 32, 32);
      const d  = x.getImageData(0, 0, 32, 32).data;
      let r = 0, g = 0, bl = 0, count = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i+3] > 128) { r += d[i]; g += d[i+1]; bl += d[i+2]; count++; }
      }
      if (count > 0) {
        r = Math.round(r/count); g = Math.round(g/count); bl = Math.round(bl/count);
        // Boost saturation slightly
        applyGlowColor(`${r},${g},${bl}`);
      }
    } catch(e) {
      applyGlowColor('30,80,160');
    }
  };
  img.onerror = () => applyGlowColor('30,80,160');
}

function applyGlowColor(rgb) {
  const color = `rgba(${rgb},0.45)`;
  const colorDim = `rgba(${rgb},0.2)`;

  playerBgColor.style.background =
    `radial-gradient(ellipse 110% 60% at 50% -5%, ${color} 0%, transparent 70%)`;
  playerCoverGlow.style.background =
    `radial-gradient(circle, ${colorDim} 0%, transparent 70%)`;

  // Update global glow orb
  glowOrb.style.background =
    `radial-gradient(circle, rgba(${rgb},0.09) 0%, transparent 70%)`;
}


/* =============================================
   PLAYBACK ENGINE
   ============================================= */
function playAudio() {
  initWebAudio();
  audio.volume = volumeLevel;

  // Visual loading pulse on cover
  const container = document.getElementById('player-cover-container');
  container.style.opacity = '0.7';

  audio.play()
    .then(() => {
      container.style.opacity = '1';
    })
    .catch(() => {
      container.style.opacity = '1';
      showToast('⚠ File audio tidak ditemukan — perbarui path di songs[]');
      // Still mark as "playing" so UI is responsive for demo
    });

  isPlaying = true;
  updatePlayUI();
}

function pauseAudio() {
  audio.pause();
  isPlaying = false;
  updatePlayUI();
}

function pauseState() {
  isPlaying = false;
  updatePlayUI();
}

function togglePlay() {
  if (!songs.length) return;
  // If nothing loaded
  if (!audio.src || audio.src === window.location.href) {
    selectSong(0, true);
    return;
  }
  isPlaying ? pauseAudio() : playAudio();
}

function updatePlayUI() {
  const playing = isPlaying;

  // Home play button
  document.getElementById('icon-play-home').style.display  = playing ? 'none' : 'block';
  document.getElementById('icon-pause-home').style.display = playing ? 'block' : 'none';
  // Player play button
  document.getElementById('icon-play-player').style.display  = playing ? 'none' : 'block';
  document.getElementById('icon-pause-player').style.display = playing ? 'block' : 'none';
  // Mini play button
  document.getElementById('icon-play-mini').style.display  = playing ? 'none' : 'block';
  document.getElementById('icon-pause-mini').style.display = playing ? 'block' : 'none';

  // Cover spin
  document.getElementById('player-cover-container')
    .classList.toggle('playing', playing);

  // Highlight eq bars
  highlightSong(currentIdx);
}


/* =============================================
   SELECT / NEXT / PREV
   ============================================= */
function selectSong(idx, autoPlay) {
  loadSong(idx, autoPlay);
}

function nextSong() {
  if (repeatMode === 2) {
    audio.currentTime = 0;
    if (isPlaying) audio.play();
    return;
  }
  const next = isShuffle ? shuffleNext() : simpleNext();
  selectSong(next, isPlaying);
}

function prevSong() {
  if (audio.currentTime > 3) { audio.currentTime = 0; return; }
  const prev = isShuffle ? shufflePrev() : simplePrev();
  selectSong(prev, isPlaying);
}

function simpleNext() {
  const n = currentIdx + 1;
  if (n >= songs.length) return repeatMode === 1 ? 0 : currentIdx;
  return n;
}
function simplePrev() {
  return (currentIdx - 1 + songs.length) % songs.length;
}

/* Shuffle logic */
function buildShuffleQueue() {
  shuffleQueue = [...Array(songs.length).keys()];
  for (let i = shuffleQueue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffleQueue[i], shuffleQueue[j]] = [shuffleQueue[j], shuffleQueue[i]];
  }
  const cur = shuffleQueue.indexOf(currentIdx);
  if (cur > 0) { [shuffleQueue[0], shuffleQueue[cur]] = [shuffleQueue[cur], shuffleQueue[0]]; }
  shufflePos = 0;
}
function shuffleNext() {
  shufflePos = (shufflePos + 1) % shuffleQueue.length;
  return shuffleQueue[shufflePos];
}
function shufflePrev() {
  shufflePos = (shufflePos - 1 + shuffleQueue.length) % shuffleQueue.length;
  return shuffleQueue[shufflePos];
}

/* Toggle shuffle */
function toggleShuffle() {
  isShuffle = !isShuffle;
  if (isShuffle) buildShuffleQueue();
  document.getElementById('btn-shuffle').classList.toggle('active', isShuffle);
  document.getElementById('btn-shuffle-home').classList.toggle('active', isShuffle);
  showToast(isShuffle ? '🔀 Acak aktif' : '🔀 Acak nonaktif');
}

/* Toggle repeat */
function toggleRepeat() {
  repeatMode = (repeatMode + 1) % 3;
  const btnRepeat = document.getElementById('btn-repeat');
  const iconAll   = document.getElementById('icon-repeat-all');
  const iconOne   = document.getElementById('icon-repeat-one');

  btnRepeat.classList.toggle('active', repeatMode > 0);
  iconAll.style.display = repeatMode === 2 ? 'none' : 'block';
  iconOne.style.display = repeatMode === 2 ? 'block' : 'none';

  const labels = ['Ulangi nonaktif', 'Ulangi semua', 'Ulangi satu'];
  showToast('🔁 ' + labels[repeatMode]);
}

/* Auto next on end */
audio.addEventListener('ended', () => {
  if (repeatMode === 2) { audio.currentTime = 0; audio.play(); return; }
  const next = isShuffle ? shuffleNext() : simpleNext();
  if (next === currentIdx && repeatMode === 0) { pauseState(); return; }
  selectSong(next, true);
});


/* =============================================
   PROGRESS BAR
   ============================================= */
audio.addEventListener('timeupdate', () => {
  if (!audio.duration || isNaN(audio.duration)) return;
  const pct = (audio.currentTime / audio.duration) * 100;
  progressFill.style.width = pct + '%';
  mpFill.style.width       = pct + '%';
  timeCurrent.textContent  = formatTime(audio.currentTime);
  timeTotal.textContent    = formatTime(audio.duration);
});

function seekTo(e, track) {
  const rect = track.getBoundingClientRect();
  const x    = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  const pct  = Math.max(0, Math.min(1, x / rect.width));
  if (audio.duration) audio.currentTime = pct * audio.duration;
  progressFill.style.width = (pct * 100) + '%';
}

/* Seek drag on progress bar */
let isSeeking = false;
progressTrack.addEventListener('mousedown',  e => { isSeeking = true; seekTo(e, progressTrack); });
progressTrack.addEventListener('touchstart', e => { isSeeking = true; seekTo(e, progressTrack); }, { passive: true });
document.addEventListener('mousemove',  e => { if (isSeeking) seekTo(e, progressTrack); });
document.addEventListener('touchmove',  e => { if (isSeeking) seekTo(e, progressTrack); }, { passive: true });
document.addEventListener('mouseup',   () => { isSeeking = false; });
document.addEventListener('touchend',  () => { isSeeking = false; });


/* =============================================
   VOLUME
   ============================================= */
function initVolumeFromLevel() {
  setVolumeFillWidth(volumeLevel);
}
function setVolumeFillWidth(pct) {
  volumeFill.style.width  = (pct * 100) + '%';
  volumeThumb.style.left  = `calc(${pct * 100}% - 6px)`;
}
function applyVolume(e, track) {
  const rect = track.getBoundingClientRect();
  const x    = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
  volumeLevel = Math.max(0, Math.min(1, x / rect.width));
  audio.volume = volumeLevel;
  setVolumeFillWidth(volumeLevel);
}

let isDraggingVol = false;
volumeTrack.addEventListener('mousedown',  e => { isDraggingVol = true; applyVolume(e, volumeTrack); });
volumeTrack.addEventListener('touchstart', e => { isDraggingVol = true; applyVolume(e, volumeTrack); }, { passive: true });
document.addEventListener('mousemove',  e => { if (isDraggingVol) applyVolume(e, volumeTrack); });
document.addEventListener('touchmove',  e => { if (isDraggingVol) applyVolume(e, volumeTrack); }, { passive: true });
document.addEventListener('mouseup',   () => { isDraggingVol = false; });
document.addEventListener('touchend',  () => { isDraggingVol = false; });


/* =============================================
   SCREEN NAVIGATION
   ============================================= */
function openPlayer() {
  // Both screens visible during transition; player slides up over home
  screenHome.classList.add('active');
  screenPlayer.classList.add('active');
  setTimeout(() => resizeCanvases(), 60);
}

function closePlayer() {
  screenPlayer.classList.remove('active');
  // home stays active underneath
}


/* =============================================
   SWIPE DOWN ON PLAYER
   ============================================= */
let touchStartY = 0;
screenPlayer.addEventListener('touchstart', e => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });
screenPlayer.addEventListener('touchend', e => {
  const dy = e.changedTouches[0].clientY - touchStartY;
  if (dy > 80) closePlayer();
}, { passive: true });


/* =============================================
   WEB AUDIO / VISUALIZER
   ============================================= */
function initWebAudio() {
  if (audioContextStarted) return;
  try {
    audioCtx   = new (window.AudioContext || window.webkitAudioContext)();
    analyser   = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    dataArray  = new Uint8Array(analyser.frequencyBinCount);
    sourceNode = audioCtx.createMediaElementSource(audio);
    sourceNode.connect(analyser);
    analyser.connect(audioCtx.destination);
    audioContextStarted = true;
  } catch(e) {
    console.warn('Web Audio API not available:', e);
  }
}

function resizeCanvases() {
  // Full visualizer
  const wrapFull = document.querySelector('.player-visualizer-wrap');
  if (wrapFull) {
    const dpr = window.devicePixelRatio || 1;
    canvasFull.width  = wrapFull.clientWidth  * dpr;
    canvasFull.height = wrapFull.clientHeight * dpr;
    ctxFull.scale(dpr, dpr);
    canvasFull._logW = wrapFull.clientWidth;
    canvasFull._logH = wrapFull.clientHeight;
  }
  // Mini visualizer
  canvasMini.width  = miniPlayer.clientWidth;
  canvasMini.height = miniPlayer.clientHeight;
  canvasMini._logW  = miniPlayer.clientWidth;
  canvasMini._logH  = miniPlayer.clientHeight;
}

function startVisualizer() {
  resizeCanvases();
  drawFrame();
}
window.addEventListener('resize', resizeCanvases);

function drawFrame() {
  animRaf = requestAnimationFrame(drawFrame);

  const W_full = canvasFull._logW || canvasFull.clientWidth;
  const H_full = canvasFull._logH || canvasFull.clientHeight;
  const W_mini = canvasMini._logW || canvasMini.clientWidth;
  const H_mini = canvasMini._logH || canvasMini.clientHeight;

  ctxFull.clearRect(0, 0, W_full * (window.devicePixelRatio||1), H_full * (window.devicePixelRatio||1));
  ctxMini.clearRect(0, 0, W_mini, H_mini);

  if (!analyser || !audioContextStarted) {
    drawIdleLine(ctxFull, W_full, H_full);
    drawIdleLine(ctxMini, W_mini, H_mini);
    return;
  }

  analyser.getByteFrequencyData(dataArray);
  const bars = Math.min(dataArray.length, 80);

  drawBars(ctxFull, W_full, H_full, bars, 1.0);
  drawBars(ctxMini, W_mini, H_mini, bars, 0.6);
}

function drawBars(ctx, W, H, bars, intensityMul) {
  const barW   = W / bars;
  const gap    = 1.5;

  for (let i = 0; i < bars; i++) {
    const t   = i / bars;
    const raw = (dataArray[Math.floor(i * dataArray.length / bars)] || 0) / 255;
    const val = raw * intensityMul;
    const bH  = Math.max(2, val * H);

    // Color: green → white at high intensity
    const greenR = 30, greenG = 215, greenB = 96;
    const whiteR = 220, whiteG = 240, whiteB = 255;
    const r = Math.round(greenR + val * (whiteR - greenR));
    const g = Math.round(greenG + val * (whiteG - greenG));
    const b = Math.round(greenB + val * (whiteB - greenB));
    const a = 0.4 + val * 0.6;

    ctx.shadowBlur  = val > 0.6 ? 6 : 0;
    ctx.shadowColor = `rgba(${r},${g},${b},0.8)`;
    ctx.fillStyle   = `rgba(${r},${g},${b},${a})`;
    ctx.fillRect(i * barW + gap, H - bH, barW - gap * 2, bH);
  }
  ctx.shadowBlur = 0;
}

function drawIdleLine(ctx, W, H) {
  ctx.clearRect(0, 0, W, H);
  const bars  = 60;
  const barW  = W / bars;
  const phase = Date.now() / 800;

  for (let i = 0; i < bars; i++) {
    const t  = i / bars;
    const bH = 2 + Math.sin(t * Math.PI * 4 + phase) * 1.5;
    ctx.fillStyle = `rgba(30,215,96,${0.12 + t * 0.06})`;
    ctx.fillRect(i * barW + 1, H - bH, barW - 2, bH);
  }
}


/* =============================================
   PARTICLES
   ============================================= */
function startParticles() {
  const canvas = document.getElementById('particles-canvas');
  const ctx    = canvas.getContext('2d');
  const dpr    = window.devicePixelRatio || 1;

  function resize() {
    canvas.width  = window.innerWidth  * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.scale(dpr, dpr);
    canvas._W = window.innerWidth;
    canvas._H = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // Create particles
  const COUNT = 55;
  const particles = Array.from({ length: COUNT }, () => spawnParticle(canvas._W, canvas._H));

  function spawnParticle(W, H) {
    return {
      x:     Math.random() * W,
      y:     Math.random() * H,
      r:     0.5 + Math.random() * 1.8,
      vx:    (Math.random() - 0.5) * 0.18,
      vy:    -0.08 - Math.random() * 0.18,
      alpha: 0.08 + Math.random() * 0.25,
      hue:   200 + Math.random() * 120,  // blue-purple range
    };
  }

  function drawParticles() {
    requestAnimationFrame(drawParticles);
    const W = canvas._W || window.innerWidth;
    const H = canvas._H || window.innerHeight;
    ctx.clearRect(0, 0, W, H);

    const now = Date.now() / 1000;
    particles.forEach((p, idx) => {
      p.x  += p.vx + Math.sin(now * 0.3 + idx) * 0.05;
      p.y  += p.vy;
      if (p.y < -10) { Object.assign(particles[idx], spawnParticle(W, H)); particles[idx].y = H + 5; }
      if (p.x < -10 || p.x > W + 10) particles[idx].x = Math.random() * W;

      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      grd.addColorStop(0,   `hsla(${p.hue},80%,70%,${p.alpha})`);
      grd.addColorStop(1,   `hsla(${p.hue},80%,70%,0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    });
  }
  drawParticles();
}


/* =============================================
   EVENTS
   ============================================= */
function attachEvents() {
  // Tapping the cover area in song list opens the fullscreen player
  songList.addEventListener('click', e => {
    const item = e.target.closest('.song-item');
    if (!item || e.target.closest('.btn-song-menu')) return;
    // Already handled by selectSong — additionally open player on mobile
    setTimeout(() => {
      if (window.innerWidth < 600) openPlayer();
    }, 120);
  });

  // Home play button
  document.getElementById('btn-play-home').addEventListener('click', togglePlay);
  // Home shuffle button
  document.getElementById('btn-shuffle-home').addEventListener('click', () => {
    toggleShuffle();
    if (!isPlaying) {
      if (isShuffle) selectSong(shuffleQueue[0], true);
      else selectSong(0, true);
    }
  });

  // Player controls
  document.getElementById('btn-play-player').addEventListener('click', togglePlay);
  document.getElementById('btn-next').addEventListener('click', nextSong);
  document.getElementById('btn-prev').addEventListener('click', prevSong);
  document.getElementById('btn-shuffle').addEventListener('click', toggleShuffle);
  document.getElementById('btn-repeat').addEventListener('click', toggleRepeat);
  document.getElementById('btn-like').addEventListener('click', toggleLike);
  document.getElementById('btn-player-down').addEventListener('click', closePlayer);

  // Mini player controls
  document.getElementById('mini-play').addEventListener('click', togglePlay);
  document.getElementById('mini-next').addEventListener('click', nextSong);
  document.getElementById('mini-prev').addEventListener('click', prevSong);

  // Click cover/info on mini player opens full player
  document.getElementById('mini-cover-wrap').addEventListener('click', openPlayer);
  document.querySelector('.mini-info').addEventListener('click', openPlayer);

  // Bottom nav (visual only — no functional pages)
  document.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', e => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    switch (e.code) {
      case 'Space':
        e.preventDefault();
        togglePlay();
        break;
      case 'ArrowRight':
        e.preventDefault();
        nextSong();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        prevSong();
        break;
    }
  });
}

function toggleLike() {
  isLiked = !isLiked;
  const btn = document.getElementById('btn-like');
  btn.classList.toggle('liked', isLiked);
  showToast(isLiked ? '💚 Ditambahkan ke lagu disukai' : '✕ Dihapus dari lagu disukai');
}


/* =============================================
   TOAST NOTIFICATION
   ============================================= */
let toastEl, toastTimer;
function showToast(msg) {
  if (!toastEl) {
    toastEl = document.createElement('div');
    toastEl.style.cssText = `
      position: fixed; bottom: calc(var(--mini-h) + var(--nav-h) + 20px);
      left: 50%; transform: translateX(-50%) translateY(20px);
      background: rgba(255,255,255,0.12);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,0.2);
      color: #fff; font-size: 13px; font-weight: 600;
      padding: 10px 20px; border-radius: 999px;
      white-space: nowrap; z-index: 9999;
      transition: opacity 0.3s, transform 0.3s cubic-bezier(0.34,1.56,0.64,1);
      opacity: 0; pointer-events: none;
    `;
    document.body.appendChild(toastEl);
  }
  toastEl.textContent = msg;
  toastEl.style.opacity   = '1';
  toastEl.style.transform = 'translateX(-50%) translateY(0)';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.style.opacity   = '0';
    toastEl.style.transform = 'translateX(-50%) translateY(10px)';
  }, 2200);
}


/* =============================================
   HELPERS
   ============================================= */
function formatTime(s) {
  if (!s || isNaN(s)) return '0:00';
  const m   = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}


/* =============================================
   KICK OFF
   ============================================= */
document.addEventListener('DOMContentLoaded', () => {
  // Ensure home screen is visible on load
  screenHome.classList.add('active');
  init();
});
