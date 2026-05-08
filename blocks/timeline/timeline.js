export default function decorate(block) {
  const rows = [...block.children];
  rows.forEach((row) => {
    const cols = [...row.children];
    if (cols.length >= 3) {
      const era = cols[0]?.textContent.trim();
      const role = cols[1]?.textContent.trim();
      const company = cols[2]?.textContent.trim();
      const desc = cols[3]?.textContent.trim() || '';

      row.textContent = '';
      row.innerHTML = `
        <div class="timeline-era">${era}</div>
        <div class="timeline-role">${role}</div>
        <div class="timeline-company">${company}</div>
        ${desc ? `<div class="timeline-desc">${desc}</div>` : ''}
      `;
    }
  });
}
