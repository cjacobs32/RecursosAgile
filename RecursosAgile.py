from flask import Flask, request, jsonify, render_template
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from functools import lru_cache
import pandas as pd
from datetime import datetime
import json
import os

app = Flask(__name__)

# Conectar con Google Sheets
import os
import json
from oauth2client.service_account import ServiceAccountCredentials
import gspread

scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]

# Intentar leer desde la variable de entorno (para Render)
credentials_json = os.getenv('GOOGLE_CREDENTIALS')
if credentials_json:
    try:
        credentials_dict = json.loads(credentials_json)
        creds = ServiceAccountCredentials.from_json_keyfile_dict(credentials_dict, scope)
        print("Credenciales cargadas desde la variable de entorno GOOGLE_CREDENTIALS")
    except (json.JSONDecodeError, ValueError) as e:
        print(f"Error al parsear GOOGLE_CREDENTIALS: {e}")
        print("Leyendo desde credentials.json debido a error en GOOGLE_CREDENTIALS")
        creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)
else:
    # Leer desde el archivo local (para pruebas locales)
    print("GOOGLE_CREDENTIALS no encontrada, leyendo desde credentials.json")
    creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)

client = gspread.authorize(creds)

try:
    sheet = client.open("Datos de Equipos").sheet1  # Hoja principal
    history_sheet = client.open("Datos de Equipos").worksheet("Historial")  # Hoja para historial
except gspread.exceptions.SpreadsheetNotFound:
    raise Exception("La hoja 'Datos de Equipos' no fue encontrada. Verifica el nombre.")
except gspread.exceptions.WorksheetNotFound:
    # Crear hoja de historial si no existe
    sheet = client.open("Datos de Equipos").sheet1
    history_sheet = client.open("Datos de Equipos").add_worksheet(title="Historial", rows="100", cols="7")
    history_sheet.append_row(["Fila", "Columna", "Valor Anterior", "Nuevo Valor", "Usuario", "Fecha", "Observaciones"])

# Historial en memoria (sincronizado con la hoja)
history = sorted(history_sheet.get_all_records(), key=lambda x: x['Fecha'], reverse=True)

# Cargar datos con caché
@lru_cache(maxsize=128)
def load_data():
    try:
        data = sheet.get_all_records()
        # Obtener todas las filas, incluyendo encabezados, para calcular el índice real
        all_rows = sheet.get_all_values()
        # Crear una lista de índices reales (excluyendo la fila de encabezados)
        indices = list(range(2, len(all_rows) + 1))  # Filas 2 en adelante
        # Combinar los datos con sus índices reales
        indexed_data = []
        for i, row in enumerate(data):
            row_copy = row.copy()
            row_copy['row_index'] = indices[i]  # Añadir el índice real
            indexed_data.append(row_copy)
        return indexed_data
    except Exception as e:
        print(f"Error al cargar datos: {e}")
        return []

# Página principal
@app.route('/')
def index():
    return render_template('index.html')

# Página de historial
@app.route('/history')
def history_page():
    return render_template('history.html')

# API para obtener datos con paginación, ordenamiento y búsqueda
@app.route('/api/datos', methods=['GET'])
def get_data():
    tren = request.args.get('tren', '')
    equipo = request.args.get('equipo', '')
    embajador = request.args.get('embajador', '')
    externo = request.args.get('externo', '')
    po = request.args.get('po', '')
    sm = request.args.get('sm', '')
    facilitador = request.args.get('facilitador', '')
    search = request.args.get('search', '')
    sort_by = request.args.get('sort_by', 'Tren')
    sort_order = request.args.get('sort_order', 'asc')

    data = load_data()

    # Aplicar filtros
    filtered_data = data
    if tren:
        filtered_data = [row for row in filtered_data if tren.lower() in row['Tren'].lower()]
    if equipo:
        filtered_data = [row for row in filtered_data if equipo.lower() in row['Equipo Agil'].lower()]
    if embajador:
        filtered_data = [row for row in filtered_data if embajador.lower() in row['Embajador'].lower()]
    if externo:
        filtered_data = [row for row in filtered_data if externo.lower() in row['Externo/TEF'].lower()]
    if po:
        filtered_data = [row for row in filtered_data if po.lower() in row['PO'].lower()]
    if sm:
        filtered_data = [row for row in filtered_data if sm.lower() in row['SM'].lower()]
    if facilitador:
        filtered_data = [row for row in filtered_data if facilitador.lower() in row['Facilitador Disciplina'].lower()]
    if search:
        filtered_data = [row for row in filtered_data if any(search.lower() in str(value).lower() for value in row.values())]

    # Ordenamiento
    if filtered_data and sort_by in filtered_data[0].keys():
        filtered_data = sorted(filtered_data, key=lambda x: str(x[sort_by]).lower(), reverse=(sort_order == 'desc'))

    # Paginación
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    start = (page - 1) * per_page
    end = start + per_page

    total = len(filtered_data)
    paginated_data = filtered_data[start:end]

    response = {
        'data': paginated_data,
        'total': total
    }
    if total == 0:
        response['message'] = 'No se encontraron datos'

    return jsonify(response)

# API para exportar a CSV
@app.route('/api/export', methods=['GET'])
def export_data():
    tren = request.args.get('tren', '')
    equipo = request.args.get('equipo', '')
    embajador = request.args.get('embajador', '')
    externo = request.args.get('externo', '')
    po = request.args.get('po', '')
    sm = request.args.get('sm', '')
    facilitador = request.args.get('facilitador', '')
    search = request.args.get('search', '')

    data = load_data()

    filtered_data = data
    if tren:
        filtered_data = [row for row in filtered_data if tren.lower() in row['Tren'].lower()]
    if equipo:
        filtered_data = [row for row in filtered_data if equipo.lower() in row['Equipo Agil'].lower()]
    if embajador:
        filtered_data = [row for row in filtered_data if embajador.lower() in row['Embajador'].lower()]
    if externo:
        filtered_data = [row for row in filtered_data if externo.lower() in row['Externo/TEF'].lower()]
    if po:
        filtered_data = [row for row in filtered_data if po.lower() in row['PO'].lower()]
    if sm:
        filtered_data = [row for row in filtered_data if sm.lower() in row['SM'].lower()]
    if facilitador:
        filtered_data = [row for row in filtered_data if facilitador.lower() in row['Facilitador Disciplina'].lower()]
    if search:
        filtered_data = [row for row in filtered_data if any(search.lower() in str(value).lower() for value in row.values())]

    # Excluir el campo row_index del CSV
    export_data = [{k: v for k, v in row.items() if k != 'row_index'} for row in filtered_data]
    df = pd.DataFrame(export_data)
    return df.to_csv(index=False), 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="datos_filtrados.csv"'
    }

# API para exportar historial a CSV
@app.route('/api/export-history', methods=['GET'])
def export_history():
    df = pd.DataFrame(history)
    return df.to_csv(index=False), 200, {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="historial_cambios.csv"'
    }

# API para actualizar datos
@app.route('/api/update', methods=['POST'])
def update_data():
    data = request.get_json()
    row_index = int(data['row'])  # 1-based desde el frontend
    column = data['column']
    new_value = data['value']

    # Validación básica
    if not new_value or new_value.strip() == '':
        return jsonify({'error': 'El valor no puede estar vacío'}), 400

    try:
        headers = sheet.row_values(1)  # Encabezados
        col_index = headers.index(column) + 1  # Índice de columna (1-based)
        old_value = sheet.cell(row_index, col_index).value  # Usar row_index directamente
        sheet.update_cell(row_index, col_index, new_value)  # Actualizar celda

        # Agregar al historial
        global history
        new_entry = {
            'Fila': row_index,
            'Columna': column,
            'Valor Anterior': old_value,
            'Nuevo Valor': new_value,
            'Usuario': 'Usuario Actual',
            'Fecha': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'Observaciones': 'Dato actualizado'
        }
        history.append(new_entry)
        history = sorted(history, key=lambda x: x['Fecha'], reverse=True)
        history_sheet.append_row([new_entry['Fila'], new_entry['Columna'], new_entry['Valor Anterior'], 
                                 new_entry['Nuevo Valor'], new_entry['Usuario'], new_entry['Fecha'], 
                                 new_entry['Observaciones']])
        if len(history) > 100:
            history = history[:100]

        load_data.cache_clear()
        return jsonify({'message': 'Dato actualizado correctamente'})
    except Exception as e:
        return jsonify({'error': f'Error al actualizar: {str(e)}'}), 500

# API para insertar nuevo registro
@app.route('/api/insert', methods=['POST'])
def insert_data():
    data = request.get_json()
    new_row = [data.get('Tren', ''), data.get('Equipo Agil', ''), data.get('Embajador', ''),
               data.get('Externo/TEF', ''), data.get('PO', ''), data.get('SM', ''),
               data.get('Facilitador Disciplina', '')]
    try:
        sheet.append_row(new_row)
        row_index = len(sheet.get_all_values())  # Última fila
        global history
        new_entry = {
            'Fila': row_index,
            'Columna': 'Nueva Fila',
            'Valor Anterior': '',
            'Nuevo Valor': 'Fila insertada',
            'Usuario': 'Usuario Actual',
            'Fecha': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'Observaciones': 'Fila insertada'
        }
        history.append(new_entry)
        history = sorted(history, key=lambda x: x['Fecha'], reverse=True)
        history_sheet.append_row([new_entry['Fila'], new_entry['Columna'], new_entry['Valor Anterior'], 
                                 new_entry['Nuevo Valor'], new_entry['Usuario'], new_entry['Fecha'], 
                                 new_entry['Observaciones']])
        if len(history) > 100:
            history = history[:100]

        load_data.cache_clear()
        return jsonify({'message': 'Fila insertada correctamente'})
    except Exception as e:
        return jsonify({'error': f'Error al insertar: {str(e)}'}), 500

# API para eliminar registro
@app.route('/api/delete', methods=['POST'])
def delete_data():
    data = request.get_json()
    row_index = int(data['row'])  # 1-based desde el frontend
    try:
        row_values = sheet.row_values(row_index)  # Obtener valores de la fila
        sheet.delete_rows(row_index)  # Eliminar la fila
        global history
        new_entry = {
            'Fila': row_index,
            'Columna': 'Fila Eliminada',
            'Valor Anterior': str(row_values),
            'Nuevo Valor': '',
            'Usuario': 'Usuario Actual',
            'Fecha': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'Observaciones': 'Fila eliminada'
        }
        history.append(new_entry)
        history = sorted(history, key=lambda x: x['Fecha'], reverse=True)
        history_sheet.append_row([new_entry['Fila'], new_entry['Columna'], new_entry['Valor Anterior'], 
                                 new_entry['Nuevo Valor'], new_entry['Usuario'], new_entry['Fecha'], 
                                 new_entry['Observaciones']])
        if len(history) > 100:
            history = history[:100]

        load_data.cache_clear()
        return jsonify({'message': 'Fila eliminada correctamente'})
    except Exception as e:
        return jsonify({'error': f'Error al eliminar: {str(e)}'}), 500

# API para obtener historial con paginación
@app.route('/api/history', methods=['GET'])
def get_history():
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))
    start = (page - 1) * per_page
    end = start + per_page

    total = len(history)
    paginated_history = history[start:end]

    return jsonify({
        'history': paginated_history,
        'total': total
    })

# API para recargar datos manualmente
@app.route('/api/reload', methods=['GET'])
def reload_data():
    load_data.cache_clear()
    data = load_data()
    return jsonify({'message': 'Datos recargados', 'data': data, 'total': len(data)})

# Manejar solicitud de favicon para evitar el error 404
@app.route('/favicon.ico')
def favicon():
    return '', 204

if __name__ == '__main__':
    app.run(debug=True)