# Import the modules we need.
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash
import os

# Add SQLAlchemy-Objekt
db = SQLAlchemy()

# Get and set the database URI and path.
def get_db_uri_and_path():
    # Path to the database file.
    db_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'local.db')
    # Database URI in the format of 'sqlite:///path/to/database/file'.
    db_uri = f'sqlite:///{db_path}'
    # Return the database URI and path to use in the app.
    return db_uri, db_path

# Add the SQLite Database if not exist.
def add_database(app):
    # Get the database URI and path.
    db_uri, db_path = get_db_uri_and_path()

    # Create the directory for the database if it doesn't exist.
    db_dir = os.path.dirname(db_path)
    if not os.path.exists(db_dir):
        os.makedirs(db_dir)

    # Check if the app already has extensions and if SQLAlchemy is among them
    if not hasattr(app, 'extensions') or 'sqlalchemy' not in app.extensions:
        # Set the database URI in the application's configuration
        app.config['SQLALCHEMY_DATABASE_URI'] = db_uri
        # Initialize SQLAlchemy for this application
        db.init_app(app)

        # Create the database if it doesn't exist
        with app.app_context():
            if not os.path.exists(db_path):
                db.create_all()

# Database model for the 'auth' table
class Auth(db.Model):
    # Define the table name and the columns.
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(20), unique=True, nullable=False)
    password = db.Column(db.String(100), nullable=False)

    # Define the __repr__ method to show the username when the object is printed. Just for debugging.
    def __repr__(self):
        return f"Auth('{self.username}')"

# Database model for the 'databases' table
class Databases(db.Model):
    # Define the table name and the columns.
    id = db.Column(db.Integer, primary_key=True)
    db_type = db.Column(db.String(20), nullable=False)
    name = db.Column(db.String(50), unique=True, nullable=False)
    db_host = db.Column(db.String(50), nullable=False)
    db_port = db.Column(db.Integer, nullable=False)
    db_user = db.Column(db.String(50), nullable=False)
    db_password = db.Column(db.String(100), nullable=False) # Here hash the password
    db_name = db.Column(db.String(500))  # Maybe add the names comma separated

    # Define the __repr__ method to show the name, type and host when the object is printed. Just for debugging.
    def __repr__(self):
        return f"DatabaseInfo('{self.name}', '{self.type}', '{self.host}')"

# Create all the databases from the class definitions.
def create_database_table(app):
    with app.app_context():
        # Create all the tables.
        db.create_all()

        # For auth table
        # Check if the table is empty and add the default admin user if no user exists.
        count = db.session.query(Auth).count()

        if count == 0:
            hashed_password = generate_password_hash('Password')
            admin = Auth(username='Admin', password=hashed_password)
            db.session.add(admin)
            db.session.commit()
