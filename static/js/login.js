/**
 * Muestra el mensaje de error si existe al cargar la página.
 */
document.addEventListener('DOMContentLoaded', () => {
    const errorMessage = document.getElementById('error-message');
    if (errorMessage.textContent.trim()) {
        errorMessage.style.display = 'block';
    }
});