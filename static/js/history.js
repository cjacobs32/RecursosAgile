// Variables globales
let historyPage = 1;
const historyPerPage = 10;

// --- Funciones de Carga de Datos ---

/**
 * Obtiene el historial de cambios y actualiza la tabla.
 * @param {number} page - Página actual para la paginación.
 */
function fetchHistory(page = 1) {
    historyPage = page;
    const user = document.getElementById('userFilter').value;
    const date = document.getElementById('dateFilter').value;
    const action = document.getElementById('actionFilter').value;
    fetch(`/api/history?user=${user}&date=${date}&action=${action}&page=${page}&per_page=${historyPerPage}`)
        .then(response => response.json())
        .then(data => {
            const tbody = document.getElementById('historyBody');
            tbody.innerHTML = '';
            data.history.forEach(row => {
                tbody.innerHTML += `
                    <tr>
                        <td>${row.Fecha}</td>
                        <td>${row.Usuario}</td>
                        <td>${row.Observaciones || 'Dato actualizado'}</td>
                        <td>${row.Fila}</td>
                        <td>${row.Columna}</td>
                        <td>${row['Valor Anterior']}</td>
                        <td>${row['Nuevo Valor']}</td>
                    </tr>`;
            });
            updateHistoryPagination(data.total);
        })
        .catch(err => {
            console.error('Error fetching history:', err);
            const tbody = document.getElementById('historyBody');
            tbody.innerHTML = '<tr><td colspan="7">Error al cargar el historial</td></tr>';
        });
}

/**
 * Actualiza la paginación de la tabla de historial.
 * @param {number} total - Total de registros.
 */
function updateHistoryPagination(total) {
    const pagination = document.getElementById('historyPagination');
    pagination.innerHTML = '';
    const totalPages = Math.ceil(total / historyPerPage);
    const start = (historyPage - 1) * historyPerPage + 1;
    const end = Math.min(historyPage * historyPerPage, total);
    document.getElementById('historyPaginationInfo').textContent = `Mostrando ${start}-${end} de ${total} cambios`;

    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === historyPage ? 'active' : ''}`;
        li.innerHTML = `<a class="page-link" href="#">${i}</a>`;
        li.onclick = (e) => {
            e.preventDefault();
            fetchHistory(i);
        };
        pagination.appendChild(li);
    }
}

// --- Funciones de Exportación ---

/**
 * Exporta el historial a un archivo CSV.
 */
function exportHistory() {
    window.location = '/api/export-history';
}

// --- Inicialización ---

/**
 * Inicializa los eventos y carga el historial al cargar la página.
 */
document.addEventListener('DOMContentLoaded', () => {
    fetchHistory(1);

    // Configurar eventos
    document.getElementById('exportBtn').onclick = exportHistory;
    document.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', () => fetchHistory(1));
    });
});