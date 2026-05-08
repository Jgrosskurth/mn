export default function decorate(block) {
  const rows = [...block.children];
  const grid = document.createElement('div');

  rows.forEach((row, i) => {
    const cols = [...row.children];
    const title = cols[0]?.textContent.trim();
    const desc = cols[1]?.textContent.trim() || '';

    const pillar = document.createElement('div');
    pillar.innerHTML = `
      <div class="pillar-number">${String(i + 1).padStart(2, '0')}</div>
      <h3>${title}</h3>
      ${desc ? `<p>${desc}</p>` : ''}
    `;
    grid.append(pillar);
  });

  block.textContent = '';
  block.append(grid);
}
