// lineage.js — Family tree visualization using D3
const Lineage = (() => {
    let allPeople = [];
    let activeIndex = -1;

    function init() {
        const input = document.getElementById('lineage-search');
        const list = document.getElementById('lineage-suggestions');

        input.addEventListener('input', () => {
            const q = input.value.toLowerCase().trim();
            if (q.length < 1) { hideList(); return; }
            const matches = allPeople.filter(p => p.name.toLowerCase().includes(q)).slice(0, 20);
            showSuggestions(matches);
        });

        input.addEventListener('keydown', (e) => {
            const items = list.querySelectorAll('li');
            if (!items.length || list.classList.contains('hidden')) return;
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                activeIndex = Math.min(activeIndex + 1, items.length - 1);
                updateActive(items);
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                activeIndex = Math.max(activeIndex - 1, 0);
                updateActive(items);
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (activeIndex >= 0 && activeIndex < items.length) {
                    items[activeIndex].click();
                }
            } else if (e.key === 'Escape') {
                hideList();
            }
        });

        // Close list on outside click
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.lineage-autocomplete')) hideList();
        });
    }

    function showSuggestions(people) {
        const list = document.getElementById('lineage-suggestions');
        list.innerHTML = '';
        activeIndex = -1;
        if (!people.length) {
            const li = document.createElement('li');
            li.textContent = 'No matches';
            li.style.color = 'var(--text-secondary)';
            li.style.cursor = 'default';
            list.appendChild(li);
            list.classList.remove('hidden');
            return;
        }
        for (const p of people) {
            const li = document.createElement('li');
            const dates = formatPersonDates(p);
            li.textContent = p.name;
            if (dates) {
                const span = document.createElement('span');
                span.className = 'ac-dates';
                span.textContent = `(${dates})`;
                li.appendChild(span);
            }
            li.addEventListener('click', () => selectPerson(p));
            list.appendChild(li);
        }
        list.classList.remove('hidden');
    }

    function hideList() {
        const list = document.getElementById('lineage-suggestions');
        list.classList.add('hidden');
        activeIndex = -1;
    }

    function updateActive(items) {
        items.forEach((li, i) => li.classList.toggle('active', i === activeIndex));
        if (activeIndex >= 0) items[activeIndex].scrollIntoView({ block: 'nearest' });
    }

    async function selectPerson(p) {
        const input = document.getElementById('lineage-search');
        input.value = p.name;
        hideList();
        await loadLineage(p.id);
    }

    async function loadPeopleList() {
        allPeople = await Api.getLineagePeople();
        allPeople.sort((a, b) => a.name.localeCompare(b.name));
    }

    async function loadLineage(id) {
        const data = await Api.getLineage(id);
        if (!data) return;

        const info = document.querySelector('.lineage-info');
        const empty = document.querySelector('.lineage-empty');
        info.classList.remove('hidden');
        empty.style.display = 'none';

        document.getElementById('lineage-subject-name').textContent = data.subject.name;

        const siblings = data.siblings || [];
        const total = data.ancestors.length + data.descendants.length + siblings.length;
        let countText =
            `${data.ancestors.length} ancestor${data.ancestors.length !== 1 ? 's' : ''}, ` +
            `${data.descendants.length} descendant${data.descendants.length !== 1 ? 's' : ''}`;
        if (siblings.length > 0) {
            countText += `, ${siblings.length} sibling${siblings.length !== 1 ? 's' : ''}`;
        }
        document.getElementById('lineage-count').textContent = countText;

        renderTree(data);
    }

    function renderTree(data) {
        const container = document.getElementById('lineage-container');
        const svg = d3.select('#lineage-svg');
        svg.selectAll('*').remove();

        // Merge all people into a single lookup
        const allNodes = [data.subject, ...data.ancestors, ...data.descendants, ...(data.siblings || []), ...(data.extendedFamily || [])];
        // Deduplicate by id
        const byId = new Map();
        for (const p of allNodes) {
            if (!byId.has(p.id)) byId.set(p.id, p);
        }

        // Build parent→children map
        const childrenMap = new Map();
        for (const [, p] of byId) {
            if (p.fatherId && byId.has(p.fatherId)) {
                if (!childrenMap.has(p.fatherId)) childrenMap.set(p.fatherId, new Set());
                childrenMap.get(p.fatherId).add(p.id);
            }
            if (p.motherId && byId.has(p.motherId)) {
                if (!childrenMap.has(p.motherId)) childrenMap.set(p.motherId, new Set());
                childrenMap.get(p.motherId).add(p.id);
            }
        }

        // Build child→parents map
        const parentsOf = new Map();
        for (const [, p] of byId) {
            const pars = [];
            if (p.fatherId && byId.has(p.fatherId)) pars.push(p.fatherId);
            if (p.motherId && byId.has(p.motherId)) pars.push(p.motherId);
            parentsOf.set(p.id, pars);
        }

        // For each person who has children, find their co-parent (spouse)
        // A couple is two people who share at least one child
        const spouseOf = new Map();
        for (const [parentId, kids] of childrenMap) {
            for (const kidId of kids) {
                const kid = byId.get(kidId);
                if (!kid) continue;
                const otherParent = (kid.fatherId === parentId) ? kid.motherId : kid.fatherId;
                if (otherParent && byId.has(otherParent)) {
                    spouseOf.set(parentId, otherParent);
                    break;
                }
            }
        }

        // Build the tree hierarchy: each node may have a "spouse" rendered beside it.
        // Children appear under the couple. We pick ONE parent as the "primary" to own
        // the children (the father, or whoever appears first in the main lineage).
        const visited = new Set();

        function buildNode(personId) {
            if (visited.has(personId)) return null;
            visited.add(personId);
            const person = byId.get(personId);
            if (!person) return null;

            // Find spouse
            let spouseNode = null;
            const spouseId = spouseOf.get(personId);
            if (spouseId && !visited.has(spouseId)) {
                visited.add(spouseId);
                const sp = byId.get(spouseId);
                if (sp) {
                    spouseNode = {
                        id: sp.id, name: sp.name,
                        birthYear: sp.birthYear, deathYear: sp.deathYear,
                        birthApprox: sp.birthApprox, deathApprox: sp.deathApprox,
                        role: sp.role, isSubject: sp.id === data.subject.id
                    };
                }
            }

            // Gather children (from this person and their spouse)
            const kidIds = new Set();
            const myKids = childrenMap.get(personId);
            if (myKids) for (const k of myKids) kidIds.add(k);
            if (spouseId) {
                const spKids = childrenMap.get(spouseId);
                if (spKids) for (const k of spKids) kidIds.add(k);
            }

            const children = [];
            for (const kidId of kidIds) {
                const child = buildNode(kidId);
                if (child) children.push(child);
            }

            return {
                id: person.id,
                name: person.name,
                birthYear: person.birthYear,
                deathYear: person.deathYear,
                birthApprox: person.birthApprox,
                deathApprox: person.deathApprox,
                role: person.role,
                isSubject: person.id === data.subject.id,
                spouse: spouseNode,
                children: children.length ? children : undefined
            };
        }

        // Find roots (people with no parents in the tree)
        const roots = [...byId.values()].filter(p => {
            return !(p.fatherId && byId.has(p.fatherId)) && !(p.motherId && byId.has(p.motherId));
        });

        // Try ALL roots and pick the one that produces the largest tree
        // containing the subject. This ensures the deepest ancestor chain
        // (e.g. Adam→...→David→...→Joseph) wins over a shallow root (e.g. Mary).
        function countTreeNodes(node) {
            let n = 1;
            if (node.spouse) n++;
            if (node.children) for (const c of node.children) n += countTreeNodes(c);
            return n;
        }

        let rootNode = null;
        let maxNodes = 0;
        for (const r of roots) {
            visited.clear();
            const tree = buildNode(r.id);
            if (tree && containsId(tree, data.subject.id)) {
                const count = countTreeNodes(tree);
                if (count > maxNodes) {
                    maxNodes = count;
                    rootNode = tree;
                }
            }
        }

        if (!rootNode) {
            visited.clear();
            rootNode = buildNode(data.subject.id);
        }
        if (!rootNode) return;

        // ── Custom layout: d3.tree for vertical placement, then shift spouses beside ──

        const nodeW = 160, nodeH = 60, spouseGap = 10, gapX = 30, gapY = 50;
        // Use wider node size to account for spouse cards
        const coupleNodeW = nodeW * 2 + spouseGap + gapX;

        // Create d3 hierarchy (spouse is metadata, not a child)
        const root = d3.hierarchy(rootNode, d => d.children);
        const treeLayout = d3.tree().nodeSize([coupleNodeW, nodeH + gapY]);
        treeLayout(root);

        // Shift nodes that don't have spouses slightly toward their parent
        // to tighten the layout (they don't need the full couple width)
        // Skip this for now — the wider spacing ensures no overlaps

        // Calculate bounds (accounting for spouse cards)
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        root.each(d => {
            const left = d.x - nodeW / 2;
            const right = d.data.spouse ? d.x + nodeW / 2 + spouseGap + nodeW : d.x + nodeW / 2;
            if (left < minX) minX = left;
            if (right > maxX) maxX = right;
            if (d.y < minY) minY = d.y;
            if (d.y + nodeH > maxY) maxY = d.y + nodeH;
        });

        const padX = 40, padY = 40;
        const svgW = maxX - minX + padX * 2;
        const svgH = maxY - minY + padY * 2;
        const offsetX = -minX + padX;
        const offsetY = -minY + padY;

        svg.attr('width', svgW).attr('height', svgH);

        const g = svg.append('g')
            .attr('transform', `translate(${offsetX}, ${offsetY})`);

        // ── Draw links ──
        // Links go from parent couple center-bottom to child top
        g.selectAll('.lineage-link')
            .data(root.links())
            .enter().append('path')
            .attr('class', 'lineage-link')
            .attr('d', d => {
                // Source: center of the couple (or person if no spouse)
                const sx = d.source.data.spouse
                    ? d.source.x + (nodeW + spouseGap) / 2
                    : d.source.x;
                const sy = d.source.y + nodeH;
                const tx = d.target.x;
                const ty = d.target.y;
                const my = (sy + ty) / 2;
                return `M${sx},${sy} C${sx},${my} ${tx},${my} ${tx},${ty}`;
            });

        // ── Draw spouse connectors (horizontal line between couple) ──
        const coupleNodes = root.descendants().filter(d => d.data.spouse);
        g.selectAll('.spouse-connector')
            .data(coupleNodes)
            .enter().append('line')
            .attr('class', 'spouse-connector')
            .attr('x1', d => d.x + nodeW / 2)
            .attr('y1', d => d.y + nodeH / 2)
            .attr('x2', d => d.x + nodeW / 2 + spouseGap)
            .attr('y2', d => d.y + nodeH / 2);

        // ── Draw primary person cards ──
        const nodes = g.selectAll('.lineage-node')
            .data(root.descendants())
            .enter().append('g')
            .attr('class', d => `lineage-node${d.data.isSubject ? ' subject' : ''}`)
            .attr('transform', d => `translate(${d.x - nodeW / 2}, ${d.y})`);

        drawCard(nodes);

        // ── Draw spouse cards beside their partner ──
        const spouseData = root.descendants().filter(d => d.data.spouse);
        const spouseNodes = g.selectAll('.lineage-node-spouse')
            .data(spouseData)
            .enter().append('g')
            .attr('class', d => `lineage-node spouse${d.data.spouse.isSubject ? ' subject' : ''}`)
            .attr('transform', d => `translate(${d.x + nodeW / 2 + spouseGap}, ${d.y})`);

        drawCard(spouseNodes, true);

        function drawCard(sel, isSpouse) {
            sel.append('rect')
                .attr('class', 'lineage-card')
                .attr('width', nodeW)
                .attr('height', nodeH)
                .attr('rx', 6);

            sel.append('text')
                .attr('class', 'lineage-name')
                .attr('x', nodeW / 2)
                .attr('y', 20)
                .attr('text-anchor', 'middle')
                .text(d => isSpouse ? d.data.spouse.name : d.data.name);

            sel.append('text')
                .attr('class', 'lineage-dates')
                .attr('x', nodeW / 2)
                .attr('y', 36)
                .attr('text-anchor', 'middle')
                .text(d => {
                    const p = isSpouse ? d.data.spouse : d.data;
                    const dates = formatPersonDates(p);
                    if (!dates) return '';
                    const age = (p.birthYear != null && p.deathYear != null)
                        ? ` (${p.deathYear - p.birthYear})`
                        : '';
                    return dates + age;
                });

            sel.append('text')
                .attr('class', 'lineage-role')
                .attr('x', nodeW / 2)
                .attr('y', 50)
                .attr('text-anchor', 'middle')
                .text(d => (isSpouse ? d.data.spouse.role : d.data.role) || '');
        }

        // Enable click-and-drag panning
        enableDragPan(container);

        // Scroll subject into view
        let subjectD = root.descendants().find(d => d.data.isSubject);
        if (!subjectD) {
            subjectD = root.descendants().find(d => d.data.spouse && d.data.spouse.isSubject);
        }
        if (subjectD) {
            const scrollX = subjectD.x + offsetX - container.clientWidth / 2;
            const scrollY = subjectD.y + offsetY - container.clientHeight / 2;
            container.scrollTo({ left: scrollX, top: scrollY, behavior: 'smooth' });
        }
    }

    function enableDragPan(container) {
        // Only attach once
        if (container._dragPanEnabled) return;
        container._dragPanEnabled = true;

        let isDragging = false;
        let startX, startY, scrollLeft, scrollTop;

        container.addEventListener('mousedown', (e) => {
            // Ignore clicks on interactive elements
            if (e.target.closest('a, button, input')) return;
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            scrollLeft = container.scrollLeft;
            scrollTop = container.scrollTop;
            container.style.cursor = 'grabbing';
            container.style.userSelect = 'none';
            e.preventDefault();
        });

        container.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            container.scrollLeft = scrollLeft - dx;
            container.scrollTop = scrollTop - dy;
        });

        const stopDrag = () => {
            if (!isDragging) return;
            isDragging = false;
            container.style.cursor = '';
            container.style.removeProperty('user-select');
        };

        container.addEventListener('mouseup', stopDrag);
        container.addEventListener('mouseleave', stopDrag);
    }

    function containsId(node, id) {
        if (node.id === id) return true;
        if (node.spouse && node.spouse.id === id) return true;
        if (node.children) return node.children.some(c => containsId(c, id));
        return false;
    }

    function formatPersonDates(p) {
        const fm = y => y < 0 ? `${Math.abs(y)} BC` : `AD ${y}`;
        const t = approx => approx ? '~' : '';
        if (p.birthYear != null && p.deathYear != null) {
            return `${t(p.birthApprox)}${fm(p.birthYear)}–${t(p.deathApprox)}${fm(p.deathYear)}`;
        }
        if (p.birthYear != null) return `b. ${t(p.birthApprox)}${fm(p.birthYear)}`;
        if (p.deathYear != null) return `d. ${t(p.deathApprox)}${fm(p.deathYear)}`;
        return '';
    }

    return { init, loadPeopleList };
})();
