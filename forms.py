from flask_wtf import FlaskForm
from wtforms import StringField, PasswordField, SubmitField, SelectField, BooleanField  # Agregamos BooleanField
from wtforms.validators import DataRequired, EqualTo, Length, Regexp

class UserForm(FlaskForm):
    username = StringField('Usuario', validators=[DataRequired()])
    password = PasswordField('Contraseña', validators=[DataRequired()])
    role = SelectField('Rol', choices=[('Admin', 'Admin'), ('Editor', 'Editor')], validators=[DataRequired()])
    submit = SubmitField('Agregar')

class LoginForm(FlaskForm):
    username = StringField('Usuario', validators=[DataRequired()])
    password = PasswordField('Contraseña', validators=[DataRequired()])
    remember = BooleanField('Recordarme')
    submit = SubmitField('Iniciar Sesión')

class ChangePasswordForm(FlaskForm):
    current_password = PasswordField('Contraseña Actual', validators=[DataRequired()])
    new_password = PasswordField('Nueva Contraseña', validators=[
        DataRequired(),
        Length(min=8, message='La contraseña debe tener al menos 8 caracteres.'),
        Regexp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)', message='La contraseña debe contener al menos una letra mayúscula, una minúscula y un número.')
    ])
    confirm_password = PasswordField('Confirmar Nueva Contraseña', validators=[
        DataRequired(),
        EqualTo('new_password', message='Las contraseñas deben coincidir.')
    ])
    submit = SubmitField('Cambiar Contraseña')