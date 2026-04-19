// scrollbar.js — Era quick-jump scrubber with haptic feedback
const EraScrubber = (() => {
    const PERIOD_ABBREVS = {
        'Creation': 'C',
        'Patriarchal': 'P',
        'Exodus & Conquest': 'E',
        'Judges': 'J',
        'United Kingdom': 'UK',
        'Divided Kingdom': 'DK',
        'Exile': 'Ex',
        'Return & Restoration': 'R',
        'Intertestamental': 'I',
        'New Testament': 'NT',
        'Apostolic Age': 'A'
    };

    let periods = [];

    function init() {
        // Populated when periods are loaded via State subscription
    }

    function setPeriods(p) {
        periods = p;
        render();
    }

    function render() {
        const el = document.getElementById('era-scrubber');
        if (!el || !periods.length) return;

        el.innerHTML = periods.map((p, i) => {
            const abbr = PERIOD_ABBREVS[p.name] || p.name.charAt(0);
            return `<div class="era-scrubber-item" data-index="${i}" data-year="${p.startYear}" title="${p.name}" style="color: ${p.color || 'var(--text-muted)'}">${abbr}</div>`;
        }).join('');

        // Touch/click handlers
        el.querySelectorAll('.era-scrubber-item').forEach(item => {
            item.addEventListener('click', () => {
                const year = parseInt(item.dataset.year);
                hapticFeedback();
                Timeline.zoomToYear(year);
                highlightItem(item);
            });
        });

        // Touch drag to scrub through eras
        let isDragging = false;
        el.addEventListener('touchstart', (e) => {
            isDragging = true;
            handleScrubTouch(e);
        }, { passive: true });
        el.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            handleScrubTouch(e);
        }, { passive: true });
        el.addEventListener('touchend', () => { isDragging = false; });
    }

    function handleScrubTouch(e) {
        const touch = e.touches[0];
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (el && el.classList.contains('era-scrubber-item')) {
            const year = parseInt(el.dataset.year);
            if (el._lastHaptic !== year) {
                el._lastHaptic = year;
                hapticFeedback();
                Timeline.zoomToYear(year);
                highlightItem(el);
            }
        }
    }

    function highlightItem(activeItem) {
        const el = document.getElementById('era-scrubber');
        if (!el) return;
        el.querySelectorAll('.era-scrubber-item').forEach(i => i.classList.remove('active'));
        activeItem.classList.add('active');
        setTimeout(() => activeItem.classList.remove('active'), 1000);
    }

    function hapticFeedback() {
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
    }

    // Update active era based on current visible year range
    function updateActiveEra(centerYear) {
        const el = document.getElementById('era-scrubber');
        if (!el) return;
        el.querySelectorAll('.era-scrubber-item').forEach((item, i) => {
            const p = periods[i];
            if (p && centerYear >= p.startYear && centerYear <= p.endYear) {
                item.classList.add('active');
            } else {
                item.classList.remove('active');
            }
        });
    }

    return { init, setPeriods, updateActiveEra };
})();
