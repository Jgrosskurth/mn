export default function decorate(block) {
  const content = block.querySelector('p') || block.querySelector('div > div');
  if (content) {
    const text = content.textContent.trim();
    block.textContent = '';
    const wrapper = document.createElement('div');
    wrapper.innerHTML = `<span class="quote-mark">“</span><p>${text}</p>`;
    block.append(wrapper);
  }
}
