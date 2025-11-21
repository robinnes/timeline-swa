const appMenu = document.querySelector('.app-menu');
const appMenuButton = document.getElementById('app-menu-button');
const appMenuDropdown = document.getElementById('app-menu-dropdown');

appMenuButton.addEventListener('click', () => {
  const isOpen = appMenu.classList.toggle('is-open');
  appMenuButton.setAttribute('aria-expanded', String(isOpen));
  appMenuDropdown.setAttribute('aria-hidden', String(!isOpen));
});

document.addEventListener('click', (e) => {
  if (!appMenu.contains(e.target)) {
    appMenu.classList.remove('is-open');
    appMenuButton.setAttribute('aria-expanded', 'false');
    appMenuDropdown.setAttribute('aria-hidden', 'true');
  }
});