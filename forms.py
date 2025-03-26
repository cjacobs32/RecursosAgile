# forms.py
from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, BooleanField, SubmitField, SelectField  # Agrega SelectField
from wtforms.validators import DataRequired, Length

class UserForm(FlaskForm):
    username = StringField('Username', validators=[DataRequired(), Length(min=3, max=20)])
    password = PasswordField('Password', validators=[DataRequired(), Length(min=6, max=20)])
    role = SelectField('Rol', choices=[('Lector', 'Lector'), ('Editor', 'Editor'), ('Admin', 'Admin')], validators=[DataRequired()])
    submit = SubmitField('Agregar')

class LoginForm(FlaskForm):
    username = StringField('Usuario', validators=[DataRequired(), Length(min=3, max=20)])
    password = PasswordField('Contraseña', validators=[DataRequired(), Length(min=6, max=20)])
    remember = BooleanField('Recordarme')
    submit = SubmitField('Iniciar Sesión')