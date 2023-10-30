/**
 * Gestione dell'autenticazione degli utenti
 */
const fastify = require('fastify')({ logger: true }); 
const jwt = require('jsonwebtoken');
const secretKey = "private_key"; // importa la PK
const formbody = require('@fastify/formbody');
fastify.register(formbody);

// MIDDLEWARE per verificare il token JWT nelle richieste protette
const validateToken = async (request, reply) => {
  try {
    const { authorization } = request.headers;
    if (!authorization) throw new Error('Token mancante');

    const [, token] = authorization.split(' ');

    const decoded = jwt.verify(token, secretKey);
    // if (decoded.role === "superuser") {
    //   const email = request.body.email || decoded.email;
    //   request.user = { email };
    // } 
    // else {
    request.user = decoded;
    // }
    
  } 
  catch (err) {
    console.error('Errore durante la verifica del token:', err);
    reply.code(403).send({ message: 'Accesso negato', error: err.message });
  }
};
  // funzione asincrona che si attiva in un punto specifico 
  // del ciclo di vita di una richiesta HTTP
  fastify.addHook('preHandler', validateToken);

  module.exports = { validateToken, secretKey };
