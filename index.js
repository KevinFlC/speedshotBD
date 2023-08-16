const express = require('express');
const mysql = require('mysql');
const cors = require('cors');
const bodyParser = require('body-parser');

const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://broker.hivemq.com');

const app = express();
const port = 3000;

// Configuración de la conexión a la base de datos
const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'medidorvelo',
});

// Conexión a la base de datos
connection.connect((err) => {
  if (err) {
    console.error('Error al conectar a la base de datos: ' + err.stack);
    return;
  }
  console.log('Conexión establecida con la base de datos');
});

// Habilitar CORS
app.use(cors());

// Configurar body-parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Ruta para el registro
app.post('/api/register', (req, res) => {
  const { nombre, apellido, nom_usuario, correo, password } = req.body;

  // Realizar inserción en la base de datos
  const query = `INSERT INTO usuario (nombre, apellido, nom_usuario, correo, password) VALUES (?, ?, ?, ?, ?)`;
  connection.query(query, [nombre, apellido, nom_usuario, correo, password], (err, result) => {
    if (err) {
      console.error('Error al insertar datos: ' + err.stack);
      res.status(500).json({ message: 'Error al registrar el usuario' });
      return;
    }
    res.status(200).json({ message: 'Usuario registrado exitosamente' });
  });
});

app.post('/api/login', (req, res) => {
  const { correo, password } = req.body;

  // Realizar consulta en la base de datos para verificar las credenciales del usuario
  const query = `SELECT correo FROM usuario WHERE correo = ? AND password = ?`;
  connection.query(query, [correo, password], (err, result) => {
    if (err) {
      console.error('Error al verificar las credenciales: ' + err.stack);
      res.status(500).json({ message: 'Error al iniciar sesión' });
      return;
    }

    if (result.length === 0) {
      res.status(401).json({ message: 'Credenciales inválidas' });
    } else {
      const user = result[0];
      res.status(200).json({ message: 'Inicio de sesión exitoso', userId: user.id });
    }
  });
});


// Ruta para obtener la informacion del usuario
app.get('/api/userinfo', (req, res) => {
  const { correo } = req.query;

  // Consulta a la base de datos para obtener la información del usuario
  const query = `SELECT numero, nombre, apellido, nom_usuario, correo FROM usuario WHERE correo = ?`;
  connection.query(query, [correo], (err, result) => {
    if (err) {
      console.error('Error al obtener la información del usuario: ' + err.stack);
      res.status(500).json({ message: 'Error al obtener la información del usuario' });
      return;
    }

    if (result.length === 0) {
      res.status(404).json({ message: 'Usuario no encontrado' });
    } else {
      res.status(200).json(result[0]);
    }
  });
});

// Ruta para obtener las mediciones de un usuario 
app.get('/api/mediciones', (req, res) => {
  const { correo } = req.query;

  const userQuery = `SELECT numero FROM usuario WHERE correo = ?`;
  connection.query(userQuery, [correo], (err, result) => {
    if (err) {
      console.error('Error al obtener la ID del usuario: ' + err.stack);
      res.status(500).json({ message: 'Error al obtener la ID del usuario' });
      return;
    }

    if (result.length === 0) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    const userId = result[0].numero;
    const medicionesQuery = `SELECT fecha_hora, velocidadmedida FROM mediciones WHERE id_usuario = ?`;
    connection.query(medicionesQuery, [userId], (err, mediciones) => {
      if (err) {
        console.error('Error al obtener las mediciones: ' + err.stack);
        res.status(500).json({ message: 'Error al obtener las mediciones' });
        return;
      }

      if (mediciones.length === 0) {
        res.status(404).json({ message: 'Mediciones no encontradas para el usuario' });
      } else {
        res.status(200).json(mediciones);
      }
    });
  });
});

// Ruta para obtener las mediciones de un usuario semanalmente
app.get('/api/semanal', (req, res) => {
  const { correo } = req.query;

  const getUserIdQuery = `SELECT numero FROM usuario WHERE correo = ?`;
  connection.query(getUserIdQuery, [correo], (err, result) => {
    if (err) {
      console.error('Error al obtener la ID del usuario: ' + err.stack);
      res.status(500).json({ message: 'Error al obtener la ID del usuario' });
      return;
    }

    if (result.length === 0) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    const userId = result[0].numero;
    const getWeeklyMedicionesQuery = `
      SELECT fecha_hora, velocidadmedida 
      FROM mediciones 
      WHERE id_usuario = ? 
      AND fecha_hora >= DATE_SUB(NOW(), INTERVAL 7 DAY);
    `;
    connection.query(getWeeklyMedicionesQuery, [userId], (err, mediciones) => {
      if (err) {
        console.error('Error al obtener las mediciones: ' + err.stack);
        res.status(500).json({ message: 'Error al obtener las mediciones' });
        return;
      }

      if (mediciones.length === 0) {
        res.status(404).json({ message: 'Mediciones no encontradas para el usuario' });
      } else {
        res.status(200).json(mediciones);
      }
    });
  });
});

// Ruta para obtener las mediciones de un usuario mensual
app.get('/api/mensual', (req, res) => {
  const { correo } = req.query;

  const getUserIdQuery = `SELECT numero FROM usuario WHERE correo = ?`;
  connection.query(getUserIdQuery, [correo], (err, result) => {
    if (err) {
      console.error('Error al obtener la ID del usuario: ' + err.stack);
      res.status(500).json({ message: 'Error al obtener la ID del usuario' });
      return;
    }

    if (result.length === 0) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    const userId = result[0].numero;
    const getMonthlyMedicionesQuery = `
      SELECT fecha_hora, velocidadmedida 
      FROM mediciones 
      WHERE id_usuario = ? 
      AND fecha_hora >= DATE_SUB(NOW(), INTERVAL 30 DAY);
    `;
    connection.query(getMonthlyMedicionesQuery, [userId], (err, mediciones) => {
      if (err) {
        console.error('Error al obtener las mediciones: ' + err.stack);
        res.status(500).json({ message: 'Error al obtener las mediciones' });
        return;
      }

      if (mediciones.length === 0) {
        res.status(404).json({ message: 'Mediciones no encontradas para el usuario' });
      } else {
        res.status(200).json(mediciones);
      }
    });
  });
});

app.get('/api/numero-usuario', (req, res) => {
  const { correo } = req.query;

  const userQuery = `SELECT numero FROM usuario WHERE correo = ?`;
  connection.query(userQuery, [correo], (err, result) => {
    if (err) {
      console.error('Error al obtener el número del usuario: ' + err.stack);
      res.status(500).json({ message: 'Error al obtener el número del usuario' });
      return;
    }

    if (result.length === 0) {
      res.status(404).json({ message: 'Usuario no encontrado' });
      return;
    }

    const numero = result[0].numero;

    // Publicar el número al tópico MQTT
    client.publish('/numero-usuario', numero.toString(), (err) => {
      if (err) {
        console.error('Error al publicar al tópico MQTT: ' + err);
        res.status(500).json({ message: 'Error al publicar el número del usuario' });
        return;
      }

      res.status(200).json({ numero });
    });
  });
});


// Ruta para obtener el contenido de las recomendaciones
app.get('/api/recomendaciones', (req, res) => {
  // Consulta a la base de datos para obtener el contenido de las recomendaciones
  const query = 'SELECT contenido FROM recomendaciones';
  connection.query(query, (err, result) => {
    if (err) {
      console.error('Error al obtener las recomendaciones: ' + err.stack);
      res.status(500).json({ message: 'Error al obtener las recomendaciones' });
      return;
    }

    res.status(200).json(result);
  });
});

// Iniciar el servidor
app.listen(port, () => {
  console.log(`Servidor API escuchando en http://localhost:${port}`);
});
