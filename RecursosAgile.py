from flask import Flask, render_template, request, redirect, url_for, jsonify, session, flash, Response
from functools import wraps, lru_cache
import gspread
from oauth2client.service_account import ServiceAccountCredentials
import csv
from io import StringIO
import os
import json
from datetime import datetime
import pandas as pd

app = Flask(__name__)
app.secret_key = "clave_secreta_muy_segura_123"

scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]

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
    print("GOOGLE_CREDENTIALS no encontrada, leyendo desde credentials.json")
    creds = ServiceAccountCredentials.from_json_keyfile_name('credentials.json', scope)

client = gspread.authorize(creds)

try:
    sheet = client.open("Datos de Equipos").sheet1
    history_sheet = client.open("Datos de Equipos").worksheet("Historial")
    user_sheet = client.open("Datos de Equipos").worksheet("Usuarios")
except gspread.exceptions.SpreadsheetNotFound:
    raise Exception("La hoja 'Datos de Equipos' no fue encontrada. Verifica el nombre.")
except gspread.exceptions.WorksheetNotFound as e:
    if "Historial" in str(e):
        sheet = client.open("Datos de Equipos").sheet1
        history_sheet = client.open("Datos de Equipos").add_worksheet(title="Historial", rows="100", cols="7")
        history_sheet.append_row(["Fila", "Columna", "Valor Anterior", "Nuevo Valor", "Usuario", "Fecha", "Observaciones"])
    elif "Usuarios" in str(e):
        user_sheet = client.open("Datos de Equipos").add_worksheet(title="Usuarios", rows="100", cols="3")
        user_sheet.append_row(["Username", "Password", "Role"])
        user_sheet.append_row(["lector1", "pass123", "Lector"])
        user_sheet.append_row(["editor1", "pass456", "Editor"])
    else:
        raise e

def login_required(f):
    def wrap(*args, **kwargs):
        if 'username' not in session:
            flash("Por favor, inicia sesión para acceder a esta página.", "error")
            return redirect(url_for('login'))
        return f(*args, **kwargs)
    wrap.__name__ = f.__name__
    return wrap

def editor_required(f):
    def wrap(*args, **kwargs):
        if 'role' not in session or session['role'] != 'Editor':
            if request.path.startswith('/api/'):
                return jsonify({'error': 'No tienes permisos para realizar esta acción'}), 403
            flash("No tienes permisos para realizar esta acción.", "error")
            return redirect(url_for('index'))
        return f(*args, **kwargs)
    wrap.__name__ = f.__name__
    return wrap

@lru_cache(maxsize=128)
def load_data():
    try:
        headers = sheet.row_values(1)
        print("Encabezados de la hoja:", headers)

        data = sheet.get_all_records()
        all_rows = sheet.get_all_values()
        indices = list(range(2, len(all_rows) + 1))
        indexed_data = []

        for i, row in enumerate(data):
            row_copy = row.copy()
            row_copy['row_index'] = indices[i]
            indexed_data.append(row_copy)

        if indexed_data:
            print("Primer registro cargado:", indexed_data[0])
        else:
            print("No se encontraron datos en la hoja.")

        return indexed_data
    except Exception as e:
        print(f"Error al cargar datos: {e}")
        return []

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        remember = request.form.get('remember_me') == 'on'
        try:
            users = user_sheet.get_all_records()
            for user in users:
                if user['Username'] == username and user['Password'] == password:
                    session['username'] = username
                    session['role'] = user['Role']
                    if remember:
                        session.permanent = True
                    else:
                        session.permanent = False
                    flash("Inicio de sesión exitoso.", "success")
                    return redirect(url_for('index'))
            flash("Usuario o contraseña incorrectos.", "error")
        except Exception as e:
            flash("Error al intentar iniciar sesión. Por favor, intenta de nuevo.", "error")
            print(f"Error al intentar iniciar sesión: {e}")
    return render_template('login.html')

@app.route('/logout')
@login_required
def logout():
    session.pop('username', None)
    session.pop('role', None)
    flash("Has cerrado sesión.", "success")
    return redirect(url_for('login'))

@app.route('/')
@login_required
def index():
    load_data.cache_clear()
    return render_template('index.html', role=session.get('role', ''))

@app.route('/history')
@login_required
@editor_required  # Restringir acceso solo a Editores
def history_page():
    return render_template('history.html', role=session.get('role', ''))

@app.route('/api/datos', methods=['GET'])
@login_required
def get_data():
    tren = request.args.get('tren', '').lower()
    equipo = request.args.get('equipo', '').lower()
    embajador = request.args.get('embajador', '').lower()
    area_pertenencia = request.args.get('area_pertenencia', '').lower()
    po = request.args.get('po', '').lower()
    sm = request.args.get('sm', '').lower()
    facilitador = request.args.get('facilitador', '').lower()
    zona_residencia = request.args.get('zona_residencia', '').lower()
    search = request.args.get('search', '').lower()
    sort_by = request.args.get('sort_by', 'Tren')
    sort_order = request.args.get('sort_order', 'asc')
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))

    data = load_data()

    filtered_data = [
        row for row in data
        if (tren in str(row.get('Tren', '')).lower() and
            equipo in str(row.get('Equipo Agil', '')).lower() and
            embajador in str(row.get('Embajador', '')).lower() and
            area_pertenencia in str(row.get('Área de pertenencia', '')).lower() and
            po in str(row.get('PO', '')).lower() and
            sm in str(row.get('SM', '')).lower() and
            facilitador in str(row.get('Facilitador Disciplina', '')).lower() and
            zona_residencia in str(row.get('Zona de residencia', '')).lower() and
            (not search or any(search in str(value).lower() for value in row.values())))
    ]

    if filtered_data and sort_by in filtered_data[0].keys():
        filtered_data.sort(key=lambda x: str(x[sort_by]).lower(), reverse=(sort_order == 'desc'))

    total = len(filtered_data)
    start = (page - 1) * per_page
    end = start + per_page
    paginated_data = filtered_data[start:end]

    response = {'data': paginated_data, 'total': total}
    if total == 0:
        response['message'] = 'No se encontraron datos'
    return jsonify(response)

@app.route('/api/export', methods=['GET'])
@login_required
def export_data():
    tren = request.args.get('tren', '').lower()
    equipo = request.args.get('equipo', '').lower()
    embajador = request.args.get('embajador', '').lower()
    area_pertenencia = request.args.get('area_pertenencia', '').lower()
    po = request.args.get('po', '').lower()
    sm = request.args.get('sm', '').lower()
    facilitador = request.args.get('facilitador', '').lower()
    zona_residencia = request.args.get('zona_residencia', '').lower()
    search = request.args.get('search', '').lower()

    data = load_data()

    filtered_data = [
        row for row in data
        if (tren in str(row.get('Tren', '')).lower() and
            equipo in str(row.get('Equipo Agil', '')).lower() and
            embajador in str(row.get('Embajador', '')).lower() and
            area_pertenencia in str(row.get('Área de pertenencia', '')).lower() and
            po in str(row.get('PO', '')).lower() and
            sm in str(row.get('SM', '')).lower() and
            facilitador in str(row.get('Facilitador Disciplina', '')).lower() and
            zona_residencia in str(row.get('Zona de residencia', '')).lower() and
            (not search or any(search in str(value).lower() for value in row.values())))
    ]

    export_data = [{k: v for k, v in row.items() if k != 'row_index'} for row in filtered_data]
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=export_data[0].keys() if export_data else ['Tren', 'Equipo Agil', 'Embajador', 'Área de pertenencia', 'PO', 'SM', 'Facilitador Disciplina', 'Zona de residencia'])
    writer.writeheader()
    writer.writerows(export_data)
    return Response(output.getvalue(), mimetype='text/csv', headers={"Content-Disposition": "attachment;filename=datos_agile.csv"})

@app.route('/api/export-history', methods=['GET'])
@login_required
@editor_required  # Restringir acceso solo a Editores
def export_history():
    history = sorted(history_sheet.get_all_records(), key=lambda x: x['Fecha'], reverse=True)
    output = StringIO()
    writer = csv.DictWriter(output, fieldnames=['Fila', 'Columna', 'Valor Anterior', 'Nuevo Valor', 'Usuario', 'Fecha', 'Observaciones'])
    writer.writeheader()
    writer.writerows(history)
    return Response(output.getvalue(), mimetype='text/csv', headers={"Content-Disposition": "attachment;filename=historial.csv"})

@app.route('/api/update', methods=['POST'])
@login_required
@editor_required
def update_data():
    data = request.get_json()
    row_index = int(data['row'])
    column = data['column']
    new_value = data['value']

    if not new_value or new_value.strip() == '':
        return jsonify({'error': 'El valor no puede estar vacío'}), 400

    try:
        headers = sheet.row_values(1)
        col_index = headers.index(column) + 1
        old_value = sheet.cell(row_index, col_index).value
        sheet.update_cell(row_index, col_index, new_value)

        new_entry = {
            'Fila': row_index,
            'Columna': column,
            'Valor Anterior': old_value,
            'Nuevo Valor': new_value,
            'Usuario': session['username'],
            'Fecha': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'Observaciones': 'Dato actualizado'
        }
        history_sheet.append_row([new_entry['Fila'], new_entry['Columna'], new_entry['Valor Anterior'], 
                                 new_entry['Nuevo Valor'], new_entry['Usuario'], new_entry['Fecha'], 
                                 new_entry['Observaciones']])

        load_data.cache_clear()
        return jsonify({'message': 'Dato actualizado correctamente'})
    except Exception as e:
        return jsonify({'error': f'Error al actualizar: {str(e)}'}), 500

@app.route('/api/insert', methods=['POST'])
@login_required
@editor_required
def insert_data():
    data = request.get_json()
    new_row = [data.get('Tren', ''), data.get('Equipo Agil', ''), data.get('Embajador', ''),
               data.get('Área de pertenencia', ''), data.get('PO', ''), data.get('SM', ''),
               data.get('Facilitador Disciplina', ''), data.get('Zona de residencia', '')]
    try:
        sheet.append_row(new_row)
        row_index = len(sheet.get_all_values())
        new_entry = {
            'Fila': row_index,
            'Columna': 'Nueva Fila',
            'Valor Anterior': '',
            'Nuevo Valor': 'Fila insertada',
            'Usuario': session['username'],
            'Fecha': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'Observaciones': 'Fila insertada'
        }
        history_sheet.append_row([new_entry['Fila'], new_entry['Columna'], new_entry['Valor Anterior'], 
                                 new_entry['Nuevo Valor'], new_entry['Usuario'], new_entry['Fecha'], 
                                 new_entry['Observaciones']])

        load_data.cache_clear()
        return jsonify({'message': 'Fila insertada correctamente'})
    except Exception as e:
        return jsonify({'error': f'Error al insertar: {str(e)}'}), 500

@app.route('/api/delete', methods=['POST'])
@login_required
@editor_required
def delete_data():
    data = request.get_json()
    row_index = int(data['row'])
    try:
        row_values = sheet.row_values(row_index)
        sheet.delete_rows(row_index)
        new_entry = {
            'Fila': row_index,
            'Columna': 'Fila Eliminada',
            'Valor Anterior': str(row_values),
            'Nuevo Valor': '',
            'Usuario': session['username'],
            'Fecha': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'Observaciones': 'Fila eliminada'
        }
        history_sheet.append_row([new_entry['Fila'], new_entry['Columna'], new_entry['Valor Anterior'], 
                                 new_entry['Nuevo Valor'], new_entry['Usuario'], new_entry['Fecha'], 
                                 new_entry['Observaciones']])

        load_data.cache_clear()
        return jsonify({'message': 'Fila eliminada correctamente'})
    except Exception as e:
        return jsonify({'error': f'Error al eliminar: {str(e)}'}), 500

@app.route('/api/history', methods=['GET'])
@login_required
@editor_required  # Restringir acceso solo a Editores
def get_history():
    user_filter = request.args.get('user', '').lower()
    date_filter = request.args.get('date', '')
    action_filter = request.args.get('action', '').lower()
    page = int(request.args.get('page', 1))
    per_page = int(request.args.get('per_page', 10))

    # Cargar el historial dinámicamente desde la hoja
    history = sorted(history_sheet.get_all_records(), key=lambda x: x['Fecha'], reverse=True)

    filtered_history = [
        row for row in history
        if (user_filter in row['Usuario'].lower() and
            (not date_filter or date_filter in row['Fecha']) and
            action_filter in row['Observaciones'].lower())
    ]

    total = len(filtered_history)
    start = (page - 1) * per_page
    end = start + per_page
    paginated_history = filtered_history[start:end]

    return jsonify({'history': paginated_history, 'total': total})

@app.route('/dashboard')
@login_required
def dashboard():
    return render_template('dashboard.html')

@app.route('/api/dashboard', methods=['GET'])
@login_required
def get_dashboard_data():
    data = load_data()
    # Cargar el historial dinámicamente para el dashboard
    history_data = sorted(history_sheet.get_all_records(), key=lambda x: x['Fecha'], reverse=True)[:5]

    teams_by_train = {}
    for row in data:
        tren = row['Tren'] or 'Sin Tren'
        teams_by_train[tren] = teams_by_train.get(tren, 0) + 1

    roles = {
        'po': sum(1 for row in data if row['PO']),
        'sm': sum(1 for row in data if row['SM']),
        'embajador': sum(1 for row in data if row['Embajador']),
        'area_pertenencia': sum(1 for row in data if row['Área de pertenencia']),
        'facilitador': sum(1 for row in data if row['Facilitador Disciplina']),
        'zona_residencia': sum(1 for row in data if row['Zona de residencia'])
    }

    return jsonify({
        'teams_by_train': teams_by_train,
        'roles': roles,
        'recent_changes': history_data
    })

@app.route('/api/custom-chart', methods=['GET'])
@login_required
def get_custom_chart_data():
    x_axis = request.args.get('x_axis', 'Tren')
    y_axis = request.args.get('y_axis', 'count')
    data = load_data()

    chart_data = {}
    if y_axis == 'count':
        for row in data:
            x_value = row.get(x_axis, 'Sin Valor') or 'Sin Valor'
            chart_data[x_value] = chart_data.get(x_value, 0) + 1
    else:
        for row in data:
            x_value = row.get(x_axis, 'Sin Valor') or 'Sin Valor'
            y_value = row.get(y_axis, '') or ''
            if x_value not in chart_data:
                chart_data[x_value] = 0
            if y_value.strip():
                chart_data[x_value] += 1

    chart_data = {k: v for k, v in chart_data.items() if v > 0}
    return jsonify({'chart_data': chart_data})

@app.route('/api/reload', methods=['GET'])
@login_required
def reload_data():
    load_data.cache_clear()
    data = load_data()
    return jsonify({'message': 'Datos recargados', 'total': len(data)})

@app.route('/favicon.ico')
def favicon():
    return '', 204

if __name__ == '__main__':
    app.run(debug=True)