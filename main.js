/* ---- Helper: simple DOM selectors ---- */
const $ = (s, ctx = document) => ctx.querySelector(s);
const $$ = (s, ctx = document) => Array.from(ctx.querySelectorAll(s));

/* Scenes */
const intro = $('#intro');
const balloonSection = $('#balloon-section');
const greeting = $('#greeting');
const cakeSection = $('#cake-section');
const giftsSection = $('#gifts-section');

/* Music */
const audio = $('#bg-music');

/* Buttons / controls */
const seeGiftsBtn = $('#see-gifts-btn');
const balloonCta = $('#balloon-cta');
const letterModal = $('#letter-modal');
const letterCloseBtn = $('#letter-close');
const openGiftBtn = $('#open-gift');

/* timings (ms) */
const HEARTS_DURATION = 10000; // hearts visible 10s
const BALLOON_CTA_AFTER = 11000;

/* start music safely (browsers may block autoplay until user interacts) */
function startMusic() {
    audio.volume = 0.5;

    // autoplay attempt
    audio.play().catch(() => {
        // browser blocked it — wait for first user interaction
        const resume = () => {
            audio.play();
            document.removeEventListener('click', resume);
            document.removeEventListener('keydown', resume);
        };
        document.addEventListener('click', resume);
        document.addEventListener('keydown', resume);
    });
}
startMusic();

// When bday.js signals balloons are finished, reveal cake and CTA
document.addEventListener('balloons:finished', () => {
    // show music toggle
    musicToggle.hidden = false;

    // switch to cake section
    if (cakeSection) {
        // small delay to let canvas fade if needed
        setTimeout(() => {
            showScene(cakeSection);
            // trigger SVG-based cake build animation (first animate has id 'bizcocho_1')
            setTimeout(() => {
                try {
                    const an = document.getElementById('bizcocho_1');
                    if (an && typeof an.beginElement === 'function') an.beginElement();

                    // Wait for the final SVG animation to end (id='crema'), then reveal gifts.
                    const finalAnim = document.getElementById('crema');
                    let revealed = false;

                    function revealGifts() {
                        if (revealed) return;
                        revealed = true;
                        // after cake animation completes, show gifts section and CTA
                        if (giftsSection) showScene(giftsSection);
                        if (seeGiftsBtn) {
                            seeGiftsBtn.hidden = false;
                            try { seeGiftsBtn.focus(); } catch (e) { }
                        }
                    }

                    if (finalAnim) {
                        // SMIL fires 'endEvent' — listen for it when supported
                        const onEnd = () => {
                            finalAnim.removeEventListener('endEvent', onEnd);
                            revealGifts();
                        };
                        try {
                            finalAnim.addEventListener('endEvent', onEnd);
                        } catch (e) {
                            // ignore
                        }
                        // fallback: compute total duration from chained anims if 'endEvent' doesn't fire
                        const ids = ['bizcocho_1', 'relleno_1', 'bizcocho_2', 'bizcocho_3', 'crema'];
                        let total = 0;
                        ids.forEach(id => {
                            const el = document.getElementById(id);
                            if (el) {
                                const d = el.getAttribute('dur');
                                if (d) total += parseFloat(d) * 1000;
                            }
                        });
                        // add small buffer
                        const fallbackMs = total > 0 ? total + 300 : 4500;
                        setTimeout(() => { revealGifts(); }, fallbackMs);
                    } else {
                        // no finalAnim found — fallback to 3s
                        setTimeout(() => { revealGifts(); }, 3000);
                    }
                } catch (e) { }
            }, 250);
        }, 200);
    }
    // Reveal of the See-your-gifts CTA is handled by the SMIL end
    // or the duration-based fallback above when a cake exists.
    // If no `#cake-section` is present (simpler layout), reveal the CTA now.
    if (!cakeSection) {
        if (seeGiftsBtn) {
            seeGiftsBtn.hidden = false;
            try { seeGiftsBtn.focus(); } catch (e) { }
        }
    }
});

/* basic scene switcher */
function showScene(el) {
    // hide all
    $$('.scene').forEach(s => s.classList.remove('active'));
    el.classList.add('active');
}

/* ---- Hearts animation (intro) ---- */
const heartsContainer = $('#hearts-container');
function makeHeart() {
    const heart = document.createElement('div');
    heart.className = 'heart';
    // random size & position
    const size = 14 + Math.random() * 26;
    heart.style.width = heart.style.height = size + 'px';
    const left = Math.random() * 100;
    heart.style.left = left + '%';
    heart.style.bottom = '-30px';
    heart.style.position = 'absolute';
    heart.style.pointerEvents = 'none';
    heart.style.zIndex = 8;
    // color gradient between red and pink and blue
    const pick = Math.random();
    const color = pick < 0.5 ? `linear-gradient(135deg, rgba(74,144,226,.95), rgba(52,124,206,.9))`
        : `linear-gradient(135deg, rgba(107,181,255,.95), rgba(74,144,226,.9))`;
    heart.style.background = color;
    heart.style.borderRadius = '50% 50% 50% 50% / 60% 60% 40% 40%';
    heart.style.transform = `rotate(${(Math.random() * 40 - 20).toFixed(2)}deg)`;
    heart.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)';
    heartsContainer.appendChild(heart);

    // animate upward using CSS transitions
    const rise = 8 + Math.random() * 18; // seconds
    heart.style.transition = `transform ${rise}s linear, opacity ${rise}s linear, bottom ${rise}s linear`;
    // force layout
    requestAnimationFrame(() => {
        heart.style.bottom = (90 + Math.random() * 40) + '%';
        heart.style.opacity = 0;
        heart.style.transform += ' translateY(-30px) scale(1.05)';
    });

    // remove after animation
    setTimeout(() => heart.remove(), (rise * 1000) + 200);
}

let heartsInterval;
function startHearts() {
    heartsInterval = setInterval(makeHeart, 350);
    // also create a few immediately
    for (let i = 0; i < 6; i++) setTimeout(makeHeart, i * 120);
}
function stopHearts() {
    clearInterval(heartsInterval);
}

let bdayScriptEl;
function ensureCanvasForBday() {
    // create canvas with id 'c' if not present
    if (!$('#c')) {
        const c = document.createElement('canvas');
        c.id = 'c';
        // ensure the canvas is inserted behind the overlay CTA so the CTA remains clickable
        if (balloonSection && balloonSection.firstChild) {
            balloonSection.insertBefore(c, balloonSection.firstChild);
        } else {
            // fallback
            balloonSection.appendChild(c);
        }
    }
}
function loadBdayScriptOnce() {
    if (bdayScriptEl) return;
    ensureCanvasForBday();
    bdayScriptEl = document.createElement('script');
    bdayScriptEl.src = 'bday.js';
    bdayScriptEl.defer = false;
    document.body.appendChild(bdayScriptEl);
}

/* letter modal */
function openLetter() {
    if (!letterModal) return;
    letterModal.hidden = false;
    letterModal.setAttribute('aria-hidden', 'false');
    // focus trap start
    try { letterModal.querySelector('.modal-inner').focus(); } catch (e) { }
}
function closeLetterModal() {
    if (!letterModal) return;
    letterModal.hidden = true;
    letterModal.setAttribute('aria-hidden', 'true');
}

/* ---- wire events ---- */
document.addEventListener('DOMContentLoaded', () => {
    // start music attempt
    startMusic();
    updateMusicToggle();
    // hide music toggle until balloons are finished
    musicToggle.hidden = true;

    // show intro first
    showScene(intro);
    startHearts();

    // after HEARTS_DURATION, transition to balloons automatically
    setTimeout(() => {
        stopHearts();
        // fade intro away
        intro.classList.add('leave');
        setTimeout(() => {
            intro.classList.remove('active', 'leave');
            // show balloon section
            showScene(balloonSection);
            startBalloonsFlow();
        }, 600);
    }, HEARTS_DURATION);

    // click handlers
    seeGiftsBtn?.addEventListener('click', () => {
        // open the letter modal
        openLetter();
    });

    letterCloseBtn?.addEventListener('click', closeLetterModal);
    openGiftBtn?.addEventListener('click', () => {
        // Close the modal when the user clicks "Close & Celebrate"
        closeLetterModal();
    });

    // close on ESC
    document.addEventListener('keydown', function escHandler(e) {
        if (e.key === 'Escape') closeLetterModal();
    });
});

function startBalloonsFlow() {
    ensureCanvasForBday();
    loadBdayScriptOnce();
    setTimeout(() => {
        balloonCta.hidden = false;
    }, BALLOON_CTA_AFTER);
}

/* small polish CSS injection for hearts and puff if not present */
(function addHeartStyles() {
    const st = document.createElement('style');
    st.innerHTML = `
  .heart{width:40px;height:40px;background:linear-gradient(135deg,#ff4d88,#ff7ab6);opacity:1;transition:opacity 8s linear, bottom 8s linear, transform 8s linear}
  .puff{pointer-events:none}
  `;
    document.head.appendChild(st);
})();
