// Variables globales
const userRole = "{{ role }}";
let currentPage = 1;
const perPage = 10;
let sortBy = 'Tren';
let sortOrder = 'asc';
let rowToDelete = null;
let rowToEdit = null;
let updatesToConfirm = null;
let editButton = null;

// --- Funciones de Carga de Datos ---

/**
 * Obtiene los parámetros de la URL y los parsea.
 * @returns {Object} Objeto con los parámetros de la URL.
 */
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    console.log('Raw URL Search:', window.location.search); // Depuración: Mostrar la cadena de búsqueda cruda
    console.log('Parsed URLSearchParams:', Array.from(params.entries())); // Depuración: Mostrar todos los parámetros parseados

    return {
        tren: params.get('tren') || '',
        equipo_agil: params.get('equipo_agil') || '',
        embajador: params.get('embajador') || '',
        area_pertenencia: params.get('area_de_pertenencia') || '',
        po: params.get('po') || '',
        sm: params.get('sm') || '',
        facilitador_disciplina: params.get('facilitador_disciplina') || '',
        zona_residencia: params.get('zona_residencia') || '',
        search: params.get('search') || '',
        returnToDashboard: params.get('returnToDashboard') === 'true',
        xAxis: params.get('xAxis') || '',
        yAxis: params.get('yAxis') || '',
        chartType: params.get('chartType') || ''
    };
}

/**
 * Aplica los filtros desde la URL al cargar la página y carga los datos.
 */
function applyFiltersFromURL() {
    const params = getQueryParams();
    console.log('Parámetros de la URL:', params); // Depuración

    // Asignar valores a los inputs
    document.getElementById('trenFilter').value = params.tren;
    document.getElementById('equipoFilter').value = params.equipo_agil;
    document.getElementById('embajadorFilter').value = params.embajador;
    document.getElementById('areaPertenenciaFilter').value = params.area_pertenencia;
    document.getElementById('poFilter').value = params.po;
    document.getElementById('smFilter').value = params.sm;
    document.getElementById('facilitadorFilter').value = params.facilitador_disciplina;
    document.getElementById('zonaResidenciaFilter').value = params.zona_residencia;
    document.getElementById('globalSearch').value = params.search;

    // Mostrar mensaje de filtro aplicado y botón para volver al gráfico
    if (params.returnToDashboard) {
        const filterMessage = document.getElementById('filterMessage');
        const filterMessageText = document.querySelector('#filterMessage p');
        let appliedFilter = '';
        if (params.tren) appliedFilter = `Tren: ${params.tren}`;
        else if (params.equipo_agil) appliedFilter = `Equipo Ágil: ${params.equipo_agil}`;
        else if (params.embajador) appliedFilter = `Embajador: ${params.embajador}`;
        else if (params.area_pertenencia) appliedFilter = `Área de pertenencia: ${params.area_pertenencia}`;
        else if (params.po) appliedFilter = `PO: ${params.po}`;
        else if (params.sm) appliedFilter = `SM: ${params.sm}`;
        else if (params.facilitador_disciplina) appliedFilter = `Facilitador Disciplina: ${params.facilitador_disciplina}`;
        else if (params.zona_residencia) appliedFilter = `Zona de residencia: ${params.zona_residencia}`;

        if (appliedFilter) {
            filterMessageText.textContent = `Mostrando datos filtrados por ${appliedFilter}`;
            filterMessage.style.display = 'flex';

            // Configurar el botón para volver al gráfico
            const returnToChartBtn = document.getElementById('returnToChartBtn');
            returnToChartBtn.addEventListener('click', () => {
                const returnURL = `/dashboard?xAxis=${encodeURIComponent(params.xAxis)}&yAxis=${encodeURIComponent(params.yAxis)}&chartType=${encodeURIComponent(params.chartType)}`;
                window.location.href = returnURL;
            });
        }
    }

    // Cargar los datos después de aplicar los filtros
    fetchData();
}

/**
 * Muestra el spinner de carga.
 */
function showLoadingSpinner() {
    document.getElementById('loading-spinner').style.display = 'block';
}

/**
 * Oculta el spinner de carga.
 */
function hideLoadingSpinner() {
    document.getElementById('loading-spinner').style.display = 'none';
}

/**
 * Obtiene los datos del servidor y los muestra en la tabla.
 * @param {number} page - Página actual para la paginación.
 */
function fetchData(page = 1) {
    currentPage = page;
    const tren = document.getElementById('trenFilter').value;
    const equipo = document.getElementById('equipoFilter').value;
    const embajador = document.getElementById('embajadorFilter').value;
    const areaPertenencia = document.getElementById('areaPertenenciaFilter').value;
    const po = document.getElementById('poFilter').value;
    const sm = document.getElementById('smFilter').value;
    const facilitador = document.getElementById('facilitadorFilter').value;
    const zonaResidencia = document.getElementById('zonaResidenciaFilter').value;
    const search = document.getElementById('globalSearch').value;

    showLoadingSpinner();
    fetch(`/api/datos?tren=${tren}&equipo=${equipo}&embajador=${embajador}&area_pertenencia=${areaPertenencia}&po=${po}&sm=${sm}&facilitador=${facilitador}&zona_residencia=${zonaResidencia}&search=${search}&sort_by=${sortBy}&sort_order=${sortOrder}&page=${page}&per_page=${perPage}`)
        .then(response => response.ok ? response.json() : Promise.reject('Error en la respuesta del servidor'))
        .then(data => {
            const tbody = document.getElementById('tableBody');
            tbody.innerHTML = '';
            const noDataMessage = document.getElementById('no-data-message');
            if (data.total === 0) {
                noDataMessage.textContent = data.message || 'No se encontraron datos';
                noDataMessage.style.display = 'block';
            } else {
                noDataMessage.style.display = 'none';
                console.log("Datos recibidos:", data.data);
                data.data.forEach(row => {
                    const rowIndex = row.row_index;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
                        <td class="editable-cell" data-row="${rowIndex}" data-column="Tren">${row['Tren'] || '-'}</td>
                        <td class="editable-cell" data-row="${rowIndex}" data-column="Equipo Agil">${row['Equipo Agil'] || '-'}</td>
                        <td class="editable-cell" data-row="${rowIndex}" data-column="Embajador">${row['Embajador'] || '-'}</td>
                        <td class="editable-cell" data-row="${rowIndex}" data-column="Área de pertenencia">${row['Área de pertenencia'] !== undefined && row['Área de pertenencia'] !== '' ? row['Área de pertenencia'] : 'No disponible'}</td>
                        <td class="editable-cell" data-row="${rowIndex}" data-column="PO">${row['PO'] || '-'}</td>
                        <td class="editable-cell" data-row="${rowIndex}" data-column="SM">${row['SM'] || '-'}</td>
                        <td class="editable-cell" data-row="${rowIndex}" data-column="Facilitador Disciplina">${row['Facilitador Disciplina'] || '-'}</td>
                        <td class="editable-cell" data-row="${rowIndex}" data-column="Zona de residencia">${row['Zona de residencia'] !== undefined && row['Zona de residencia'] !== '' ? row['Zona de residencia'] : 'No disponible'}</td>
                        <td class="action-cell">
                            ${userRole === 'Editor' ? `
                                <span class="edit-btn" onclick="startEditRow(this, ${rowIndex})"><i class="fas fa-edit"></i></span>
                                <span class="confirm-btn" onclick="confirmEditRow(this, ${rowIndex})"><i class="fas fa-check"></i></span>
                                <span class="cancel-btn" onclick="cancelEditRow(this, ${rowIndex})"><i class="fas fa-times"></i></span>
                                <span class="delete-btn" onclick="showDeleteModal(this, ${rowIndex})"><i class="fas fa-trash"></i></span>
                            ` : ''}
                        </td>
                    `;
                    tr.dataset.tren = row['Tren'] || 'Sin Tren';
                    tr.dataset.equipo = row['Equipo Agil'] || 'Sin Equipo';
                    tbody.appendChild(tr);
                });
            }
            updatePagination(data.total);
        })
        .catch(err => {
            console.error('Error fetching data:', err);
            document.getElementById('no-data-message').textContent = 'Error al cargar los datos';
            document.getElementById('no-data-message').style.display = 'block';
        })
        .finally(() => hideLoadingSpinner());
}

/**
 * Actualiza la paginación de la tabla.
 * @param {number} total - Total de registros.
 */
function updatePagination(total) {
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    const totalPages = Math.ceil(total / perPage);
    const start = (currentPage - 1) * perPage + 1;
    const end = Math.min(currentPage * perPage, total);
    document.getElementById('paginationInfo').textContent = `Mostrando ${start}-${end} de ${total} registros`;

    for (let i = 1; i <= totalPages; i++) {
        const li = document.createElement('li');
        li.className = `page-item ${i === currentPage ? 'active' : ''}`;
        const a = document.createElement('a');
        a.className = 'page-link';
        a.textContent = i;
        a.href = '#';
        a.addEventListener('click', (e) => {
            e.preventDefault();
            fetchData(i);
        });
        li.appendChild(a);
        pagination.appendChild(li);
    }
}

// --- Funciones de Exportación y Filtros ---

/**
 * Exporta los datos filtrados a un archivo CSV.
 */
function exportToCSV() {
    const tren = document.getElementById('trenFilter').value;
    const equipo = document.getElementById('equipoFilter').value;
    const embajador = document.getElementById('embajadorFilter').value;
    const areaPertenencia = document.getElementById('areaPertenenciaFilter').value;
    const po = document.getElementById('poFilter').value;
    const sm = document.getElementById('smFilter').value;
    const facilitador = document.getElementById('facilitadorFilter').value;
    const zonaResidencia = document.getElementById('zonaResidenciaFilter').value;
    const search = document.getElementById('globalSearch').value;
    window.location.href = `/api/export?tren=${tren}&equipo=${equipo}&embajador=${embajador}&area_pertenencia=${areaPertenencia}&po=${po}&sm=${sm}&facilitador=${facilitador}&zona_residencia=${zonaResidencia}&search=${search}`;
}

/**
 * Limpia todos los filtros y recarga los datos.
 */
function clearFilters() {
    document.querySelectorAll('input.form-control').forEach(input => input.value = '');
    document.getElementById('filterMessage').style.display = 'none';
    fetchData(1);
}

/**
 * Recarga los datos desde el servidor.
 */
function reloadData() {
    showLoadingSpinner();
    fetch('/api/reload')
        .then(response => response.json())
        .then(data => {
            const noDataMessage = document.getElementById('no-data-message');
            if (data.total === 0) {
                noDataMessage.textContent = data.message || 'No se encontraron datos';
                noDataMessage.style.display = 'block';
            } else {
                noDataMessage.style.display = 'none';
                fetchData(1);
            }
        })
        .catch(err => {
            console.error('Error reloading data:', err);
            document.getElementById('no-data-message').textContent = 'Error al recargar los datos';
            document.getElementById('no-data-message').style.display = 'block';
        })
        .finally(() => hideLoadingSpinner());
}

// --- Funciones de Edición de Filas ---

/**
 * Inicia la edición de una fila.
 * @param {HTMLElement} button - Botón de edición.
 * @param {number} rowIndex - Índice de la fila.
 */
function startEditRow(button, rowIndex) {
    if (userRole !== 'Editor') {
        alert('No tienes permisos para editar datos.');
        return;
    }
    const row = button.closest('tr');
    const cells = row.querySelectorAll('.editable-cell');
    const oldValues = {};
    cells.forEach(cell => {
        const column = cell.getAttribute('data-column');
        oldValues[column] = cell.textContent.trim();
        cell.classList.add('editing');
        cell.setAttribute('contenteditable', 'true');
        cell.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirmEditRow(button, rowIndex);
            }
        });
    });
    button.style.display = 'none';
    row.querySelector('.confirm-btn').style.display = 'inline-block';
    row.querySelector('.cancel-btn').style.display = 'inline-block';
    row.dataset.oldValues = JSON.stringify(oldValues);
}

/**
 * Confirma los cambios realizados en una fila y muestra un modal de confirmación.
 * @param {HTMLElement} button - Botón de confirmación.
 * @param {number} rowIndex - Índice de la fila.
 */
function confirmEditRow(button, rowIndex) {
    editButton = button;
    rowToEdit = rowIndex;
    const row = button.closest('tr');
    const cells = row.querySelectorAll('.editable-cell');
    const oldValues = JSON.parse(row.dataset.oldValues || '{}');
    const updates = [];
    let hasChanges = false;

    cells.forEach(cell => {
        const column = cell.getAttribute('data-column');
        const newValue = cell.textContent.trim();
        const oldValue = oldValues[column] || '';
        if (newValue !== oldValue) {
            hasChanges = true;
            updates.push({ row: rowIndex, column, value: newValue });
        }
        cell.classList.remove('editing');
        cell.removeAttribute('contenteditable');
    });

    if (!hasChanges) {
        button.style.display = 'none';
        row.querySelector('.cancel-btn').style.display = 'none';
        row.querySelector('.edit-btn').style.display = 'inline-block';
        return;
    }

    updatesToConfirm = updates;
    const equipo = row.dataset.equipo;
    const changes = updates.map(update => `${update.column}: "${update.value}"`).join(', ');
    const message = `Estás a punto de modificar el equipo "${equipo}". Los cambios son: ${changes}. ¿Deseas continuar?`;
    document.getElementById('editRowMessage').textContent = message;
    const modal = new bootstrap.Modal(document.getElementById('editRowModal'));
    modal.show();

    // Establecer foco en el botón "Guardar Cambios" y agregar evento para Enter
    const confirmEditBtn = document.getElementById('confirmEditBtn');
    confirmEditBtn.focus();
    const editModal = document.getElementById('editRowModal');
    editModal.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            saveEditRow();
        }
    });
}

/**
 * Guarda los cambios de edición en el servidor.
 */
function saveEditRow() {
    if (!updatesToConfirm || !rowToEdit) return;

    showLoadingSpinner();
    Promise.all(updatesToConfirm.map(update => 
        fetch('/api/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(update)
        }).then(response => response.json())
    ))
    .then(results => {
        const errors = results.filter(r => r.error);
        if (errors.length > 0) {
            document.getElementById('error-message').textContent = errors.map(e => e.error).join(', ');
            document.getElementById('error-message').style.display = 'block';
            setTimeout(() => document.getElementById('error-message').style.display = 'none', 2000);
        } else {
            document.getElementById('message').textContent = 'Fila actualizada correctamente';
            document.getElementById('message').style.display = 'block';
            setTimeout(() => document.getElementById('message').style.display = 'none', 2000);
            fetchData(currentPage);
        }
        editButton.style.display = 'none';
        editButton.closest('tr').querySelector('.cancel-btn').style.display = 'none';
        editButton.closest('tr').querySelector('.edit-btn').style.display = 'inline-block';
        bootstrap.Modal.getInstance(document.getElementById('editRowModal')).hide();
        rowToEdit = null;
        updatesToConfirm = null;
        editButton = null;
    })
    .catch(err => {
        console.error('Error updating row:', err);
        document.getElementById('error-message').textContent = 'Error al actualizar la fila';
        document.getElementById('error-message').style.display = 'block';
        setTimeout(() => document.getElementById('error-message').style.display = 'none', 2000);
        bootstrap.Modal.getInstance(document.getElementById('editRowModal')).hide();
        rowToEdit = null;
        updatesToConfirm = null;
        editButton = null;
    })
    .finally(() => hideLoadingSpinner());
}

/**
 * Cancela la edición de una fila y restaura los valores originales.
 * @param {HTMLElement} button - Botón de cancelación.
 * @param {number} rowIndex - Índice de la fila.
 */
function cancelEditRow(button, rowIndex) {
    const row = button.closest('tr');
    const oldValues = JSON.parse(row.dataset.oldValues);
    row.querySelectorAll('.editable-cell').forEach(cell => {
        const column = cell.getAttribute('data-column');
        cell.textContent = oldValues[column];
        cell.classList.remove('editing');
        cell.removeAttribute('contenteditable');
    });
    button.style.display = 'none';
    row.querySelector('.edit-btn').style.display = 'inline-block';
    row.querySelector('.confirm-btn').style.display = 'none';
}

// --- Funciones de Eliminación de Filas ---

/**
 * Muestra el modal de confirmación para eliminar una fila.
 * @param {HTMLElement} button - Botón de eliminación.
 * @param {number} rowIndex - Índice de la fila.
 */
function showDeleteModal(button, rowIndex) {
    if (userRole !== 'Editor') {
        alert('No tienes permisos para eliminar datos.');
        return;
    }
    rowToDelete = rowIndex;
    const row = button.closest('tr');
    const tren = row.dataset.tren;
    const equipo = row.dataset.equipo;
    const message = `Estás a punto de eliminar el equipo "${equipo}" del tren "${tren}". Esta acción no se puede deshacer. ¿Deseas continuar?`;
    document.getElementById('deleteRowMessage').textContent = message;
    const modal = new bootstrap.Modal(document.getElementById('deleteRowModal'));
    modal.show();

    // Establecer foco en el botón "Eliminar" y agregar evento para Enter
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    confirmDeleteBtn.focus();
    const deleteModal = document.getElementById('deleteRowModal');
    deleteModal.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            deleteRow();
        }
    });
}

/**
 * Elimina una fila del servidor.
 */
function deleteRow() {
    if (!rowToDelete) return;

    showLoadingSpinner();
    fetch('/api/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ row: rowToDelete })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            document.getElementById('error-message').textContent = data.error;
            document.getElementById('error-message').style.display = 'block';
            setTimeout(() => document.getElementById('error-message').style.display = 'none', 2000);
        } else {
            document.getElementById('message').textContent = 'Fila eliminada correctamente';
            document.getElementById('message').style.display = 'block';
            setTimeout(() => document.getElementById('message').style.display = 'none', 2000);
            fetchData(currentPage);
        }
        bootstrap.Modal.getInstance(document.getElementById('deleteRowModal')).hide();
        rowToDelete = null;
    })
    .catch(err => {
        console.error('Error deleting row:', err);
        document.getElementById('error-message').textContent = 'Error al eliminar la fila';
        document.getElementById('error-message').style.display = 'block';
        setTimeout(() => document.getElementById('error-message').style.display = 'none', 2000);
        bootstrap.Modal.getInstance(document.getElementById('deleteRowModal')).hide();
        rowToDelete = null;
    })
    .finally(() => hideLoadingSpinner());
}

// --- Funciones de Inserción de Filas ---

/**
 * Muestra el modal para insertar una nueva fila.
 */
function insertRow() {
    if (userRole !== 'Editor') {
        alert('No tienes permisos para insertar datos.');
        return;
    }
    const modal = new bootstrap.Modal(document.getElementById('addRowModal'));
    modal.show();

    // Establecer foco en el primer campo y agregar evento para Enter
    const firstInput = document.getElementById('newTren');
    firstInput.focus();
    const addRowModal = document.getElementById('addRowModal');
    addRowModal.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            submitNewRow();
        }
    });
}

/**
 * Envía una nueva fila al servidor para su inserción.
 */
function submitNewRow() {
    const newRow = {
        'Tren': document.getElementById('newTren').value || '',
        'Equipo Agil': document.getElementById('newEquipo').value || '',
        'Embajador': document.getElementById('newEmbajador').value || '',
        'Área de pertenencia': document.getElementById('newAreaPertenencia').value || '',
        'PO': document.getElementById('newPO').value || '',
        'SM': document.getElementById('newSM').value || '',
        'Facilitador Disciplina': document.getElementById('newFacilitador').value || '',
        'Zona de residencia': document.getElementById('newZonaResidencia').value || ''
    };
    fetch('/api/insert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRow)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) alert(data.error);
        else {
            fetchData(currentPage);
            bootstrap.Modal.getInstance(document.getElementById('addRowModal')).hide();
        }
    });
}

// --- Inicialización y Eventos ---

/**
 * Inicializa los eventos y carga los datos al cargar la página.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Aplicar filtros desde la URL y cargar datos
    applyFiltersFromURL();
    fetchData();

    // Configurar eventos
    document.getElementById('reloadBtn').addEventListener('click', reloadData);
    document.getElementById('exportBtn').addEventListener('click', exportToCSV);
    document.getElementById('confirmDeleteBtn').addEventListener('click', deleteRow);
    document.getElementById('confirmEditBtn').addEventListener('click', saveEditRow);
    const addRowBtn = document.getElementById('addRowBtn');
    if (addRowBtn) addRowBtn.addEventListener('click', insertRow);

    // Configurar eventos de entrada para filtros
    document.querySelectorAll('input.form-control').forEach(input => {
        input.addEventListener('input', () => fetchData(1));
    });

    // Inicializar tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
});