// scrollbar.js — Era quick-jump ribbon (mobile horizontal pills)
//
// Renders the horizontal era ribbon docked above the bottom-nav. Each pill
// shows era name + color dot. Tap = zoom timeline to that era. Scroll-snap
// keeps the active era centered as the timeline pans.
const EraScrubber = (() => {
    let periods = [];

    function init() {
        // Periods are pushed via setPeriods() once Api.getPeriods resolves.
    }

    function setPeriods(p) {
        periods = p;
        render();
    }

    function render() {
        const ribbon = document.getElementById('era-ribbon');
        if (!ribbon || !periods.length) return;

        ribbon.innerHTML = periods.map((p, i) =>
            `<button class="era-ribbon-item" type="button" data-index="${i}" data-year="${p.startYear}" title="${escapeAttr(p.name)}" aria-label="Jump to ${escapeAttr(p.name)}">
                <span class="era-dot" style="background:${p.color || 'var(--accent)'}"></span>
                <span class="era-ribbon-label">${escapeAttr(p.name)}</span>
            </button>`
        ).join('');

        ribbon.querySelectorAll('.era-ribbon-item').forEach(item => {
            item.addEventListener('click', () => {
                const idx = parseInt(item.dataset.index);
                const p = periods[idx];
                if (!p) return;
                if (window._vibrate) window._vibrate(8);
                fitToEra(p);
                setActive(item, ribbon);
            });
        });
    }

    function fitToEra(p) {
        if (!p || typeof Timeline === 'undefined') return;
        const center = (p.startYear + p.endYear) / 2;
        // Actually FIT the era (with breathing room) — a same-zoom pan
        // moved the view ~8px on a 6,000-year canvas and read as a no-op
        Timeline.zoomToYear(center, (p.endYear - p.startYear) * 1.15);
    }

    function setActive(activeItem, ribbon) {
        ribbon.querySelectorAll('.era-ribbon-item').forEach(i => i.classList.remove('active'));
        activeItem.classList.add('active');
        try {
            activeItem.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        } catch {}
    }

    /** Called by Timeline as the visible year range changes. */
    function updateActiveEra(centerYear) {
        const ribbon = document.getElementById('era-ribbon');
        if (!ribbon) return;
        const items = ribbon.querySelectorAll('.era-ribbon-item');
        if (!items.length) return;
        let activeIdx = -1;
        for (let i = 0; i < periods.length; i++) {
            const p = periods[i];
            if (centerYear >= p.startYear && centerYear <= p.endYear) {
                activeIdx = i;
                break;
            }
        }
        items.forEach((item, i) => item.classList.toggle('active', i === activeIdx));
        if (activeIdx >= 0) {
            const item = items[activeIdx];
            try {
                const rect = item.getBoundingClientRect();
                const ribRect = ribbon.getBoundingClientRect();
                const center = ribRect.left + ribRect.width / 2;
                if (Math.abs(rect.left + rect.width / 2 - center) > 80) {
                    item.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            } catch {}
        }
    }

    function escapeAttr(s) {
        return String(s).replace(/[&<>"']/g, c => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
        }[c]));
    }

    return { init, setPeriods, updateActiveEra };
})();
