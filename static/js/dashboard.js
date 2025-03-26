// Variable global para el gráfico
let customChart;

// --- Funciones de Utilidad ---

/**
 * Normaliza texto quitando acentos y convirtiendo a minúsculas.
 * @param {string} text - Texto a normalizar.
 * @returns {string} Texto normalizado.
 */
function normalizeText(text) {
    return text
        .normalize("NFD") // Descomponer caracteres acentuados
        .replace(/[\u0300-\u036f]/g, "") // Eliminar marcas diacríticas (acentos)
        .toLowerCase()
        .replace(/\s+/g, '_'); // Reemplazar espacios por guiones bajos
}

/**
 * Obtiene los parámetros de la URL.
 * @returns {Object} Objeto con los parámetros de la URL.
 */
function getQueryParams() {
    const params = new URLSearchParams(window.location.search);
    return {
        xAxis: params.get('xAxis') || '',
        yAxis: params.get('yAxis') || '',
        chartType: params.get('chartType') || ''
    };
}

// --- Funciones de Carga de Datos ---

/**
 * Obtiene los datos del dashboard y actualiza la tabla de actividad reciente.
 */
function fetchDashboardData() {
    fetch('/api/dashboard')
        .then(response => response.json())
        .then(data => {
            const recentChangesBody = document.getElementById('recentChangesBody');
            recentChangesBody.innerHTML = '';
            data.recent_changes.forEach(change => {
                recentChangesBody.innerHTML += `
                    <tr>
                        <td>${change.Fecha}</td>
                        <td>${change.Usuario}</td>
                        <td>${change.Observaciones || 'Dato actualizado'}</td>
                        <td>${change['Valor Anterior']}</td>
                        <td>${change['Nuevo Valor']}</td>
                    </tr>`;
            });
        });
}

// --- Funciones de Gráficos ---

/**
 * Genera un gráfico personalizado basado en los valores seleccionados.
 */
function generateChart() {
    const xAxis = document.getElementById('xAxis').value;
    const yAxis = document.getElementById('yAxis').value;
    const chartType = document.getElementById('chartType').value;

    fetch(`/api/custom-chart?x_axis=${xAxis}&y_axis=${yAxis}`)
        .then(response => response.json())
        .then(data => {
            const ctx = document.getElementById('customChart').getContext('2d');
            if (customChart) {
                customChart.destroy(); // Destruir el gráfico anterior para evitar conflictos
            }

            const labels = Object.keys(data.chart_data);
            const values = Object.values(data.chart_data);

            const chartData = {
                labels: labels,
                datasets: [{
                    label: yAxis === 'count' ? `Conteo de equipos por ${xAxis}` : `Presencia de ${yAxis} por ${xAxis}`,
                    data: values,
                    backgroundColor: chartType === 'pie' ? ['#00ADEF', '#28a745', '#0052A3', '#dc3545', '#ffca28', '#6f42c1'] : '#00ADEF',
                    borderColor: '#0052A3',
                    borderWidth: 1
                }]
            };

            customChart = new Chart(ctx, {
                type: chartType,
                data: chartData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: chartType !== 'pie' ? {
                        y: { beginAtZero: true, title: { display: true, text: yAxis === 'count' ? 'Cantidad' : 'Presencia' } },
                        x: { title: { display: true, text: xAxis } }
                    } : {},
                    plugins: {
                        title: {
                            display: true,
                            text: yAxis === 'count' ? `Conteo de equipos por ${xAxis}` : `Distribución de ${yAxis} por ${xAxis}`
                        }
                    },
                    onClick: (event, elements) => {
                        if (elements.length > 0) {
                            const elementIndex = elements[0].index;
                            const label = labels[elementIndex]; // Valor del eje X (por ejemplo, "TEF (EXT)")
                            const filterKey = normalizeText(xAxis); // Normalizar "Área de pertenencia" a "area_de_pertenencia"
                            // Redirigir a la página principal con el filtro y parámetros del gráfico
                            const returnParams = `xAxis=${encodeURIComponent(xAxis)}&yAxis=${encodeURIComponent(yAxis)}&chartType=${encodeURIComponent(chartType)}`;
                            window.location.href = `/?${filterKey}=${encodeURIComponent(label)}&returnToDashboard=true&${returnParams}`;
                        }
                    },
                    onHover: (event, elements) => {
                        // Cambiar el cursor a "pointer" cuando hay elementos bajo el mouse
                        event.native.target.style.cursor = elements.length > 0 ? 'pointer' : 'default';
                    }
                }
            });
        })
        .catch(err => console.error('Error generando gráfico:', err));
}

/**
 * Restablece el gráfico y los selectores a sus valores predeterminados.
 */
function resetChart() {
    document.getElementById('xAxis').value = 'Tren';
    document.getElementById('yAxis').value = 'count';
    document.getElementById('chartType').value = 'bar';
    if (customChart) {
        customChart.destroy();
    }
    const ctx = document.getElementById('customChart').getContext('2d');
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    // Limpiar la URL para evitar que los parámetros persistan
    window.history.replaceState({}, document.title, '/dashboard');
}

/**
 * Configura un gráfico predefinido.
 * @param {string} xAxis - Valor del eje X.
 * @param {string} yAxis - Valor del eje Y.
 * @param {string} chartType - Tipo de gráfico.
 */
function presetChart(xAxis, yAxis, chartType) {
    document.getElementById('xAxis').value = xAxis;
    document.getElementById('yAxis').value = yAxis;
    document.getElementById('chartType').value = chartType;
    generateChart();
}

/**
 * Restaura el gráfico desde los parámetros de la URL al cargar la página.
 */
function restoreChartFromURL() {
    const params = getQueryParams();
    if (params.xAxis && params.yAxis && params.chartType) {
        // Establecer los valores de los selectores
        document.getElementById('xAxis').value = params.xAxis;
        document.getElementById('yAxis').value = params.yAxis;
        document.getElementById('chartType').value = params.chartType;
        // Generar el gráfico automáticamente
        generateChart();
    }
}

// --- Inicialización ---

/**
 * Inicializa los eventos y carga los datos al cargar la página.
 */
document.addEventListener('DOMContentLoaded', () => {
    fetchDashboardData();
    restoreChartFromURL(); // Restaurar el gráfico si hay parámetros en la URL
});