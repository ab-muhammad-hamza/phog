function restartAnimation() {    
    const element = document.querySelector('.bottom');
    element.style.animation = 'none';
    requestAnimationFrame(() => {
        element.style.animation = '';
    });
}