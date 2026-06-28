-- ============================================================
-- CINE LA PAZ - Versión Simplificada 
-- ============================================================

DROP DATABASE IF EXISTS cine_db;
CREATE DATABASE cine_db;
USE cine_db;

-- ============================================================
-- FASE 1: TABLAS
-- ============================================================

CREATE TABLE Rol (
    idRol VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT
);

-- SE INTEGRAN NIT Y RAZON SOCIAL AQUÍ
CREATE TABLE Usuario (
    idUsuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre1 VARCHAR(50) NOT NULL,
    nombre2 VARCHAR(50),
    apellidoP VARCHAR(50) NOT NULL,
    apellidoM VARCHAR(50),
    ci VARCHAR(20),
    correo VARCHAR(100) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    fechaNacimiento DATE,
    contrasena VARCHAR(255) NOT NULL,
    -- Campos exclusivos para clientes (pueden ser NULL)
    nit VARCHAR(20) NULL,
    razonSocial VARCHAR(100) NULL,
    estado BOOLEAN DEFAULT TRUE,
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT
);

-- TABLA INTERMEDIA MULTIROLES (Gobierna los permisos de empleados y clientes)
CREATE TABLE Usuario_Rol (
    idUsuario INT NOT NULL,
    idRol VARCHAR(50) NOT NULL,
    PRIMARY KEY (idUsuario, idRol),
    FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario) ON DELETE CASCADE,
    FOREIGN KEY (idRol) REFERENCES Rol(idRol) ON DELETE CASCADE
);

CREATE TABLE Promocion (
    idPromocion VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    fechaInicio DATE,
    fechaFin DATE,
    tipo VARCHAR(50),
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT
);

CREATE TABLE Pelicula (
    idPelicula INT AUTO_INCREMENT PRIMARY KEY,
    titulo VARCHAR(150) NOT NULL,
    director VARCHAR(100),
    sinopsis TEXT,
    posterUrl VARCHAR(255),
    duracionMinutos INT,
    clasificacionEdad VARCHAR(20),
    fechaEstreno DATE,
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT
);

CREATE TABLE Sala (
    idSala VARCHAR(50) PRIMARY KEY,
    tipo VARCHAR(50),
    capacidadTotal INT NOT NULL,
    filas INT NOT NULL,
    columnas INT NOT NULL,
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT
);

CREATE TABLE Asiento (
    idAsiento VARCHAR(50) PRIMARY KEY,
    idSala VARCHAR(50) NOT NULL,
    fila VARCHAR(10) NOT NULL,
    columna INT NOT NULL,
    estado BOOLEAN DEFAULT TRUE,
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT,
    FOREIGN KEY (idSala) REFERENCES Sala(idSala) ON DELETE CASCADE
);

CREATE TABLE Funcion (
    idFuncion INT AUTO_INCREMENT PRIMARY KEY,
    idSala VARCHAR(50) NOT NULL,
    idPelicula INT NOT NULL,
    fecha DATE NOT NULL,
    horaInicio TIME NOT NULL,
    horaFin TIME NOT NULL,
    precioBase DECIMAL(10, 2) NOT NULL,
    promocionActiva BOOLEAN DEFAULT FALSE,
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT,
    FOREIGN KEY (idSala) REFERENCES Sala(idSala),
    FOREIGN KEY (idPelicula) REFERENCES Pelicula(idPelicula)
);

-- VENTA UNIFICADA (incluye campos de pago anteriormente en tabla Pago)
CREATE TABLE Venta (
    idVenta INT AUTO_INCREMENT PRIMARY KEY,
    idCliente INT,
    idEncargado INT,
    idFuncion INT NOT NULL,
    idPromocion VARCHAR(50),
    fechaCompra DATETIME NOT NULL,
    tipo VARCHAR(50),
    montoTotal DECIMAL(10, 2) NOT NULL,
    estadoVenta VARCHAR(50),
    metodoPago VARCHAR(50),
    estadoPago VARCHAR(50),
    codigoTransaccion VARCHAR(100),
    fechaPago DATETIME,
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT,
    FOREIGN KEY (idCliente) REFERENCES Usuario(idUsuario),
    FOREIGN KEY (idEncargado) REFERENCES Usuario(idUsuario),
    FOREIGN KEY (idFuncion) REFERENCES Funcion(idFuncion),
    FOREIGN KEY (idPromocion) REFERENCES Promocion(idPromocion)
);

CREATE TABLE Comprobante (
    idComprobante INT AUTO_INCREMENT PRIMARY KEY,
    idVenta INT UNIQUE NOT NULL,
    numero VARCHAR(50) NOT NULL,
    fechaEmision DATETIME NOT NULL,
    nitCliente VARCHAR(20),
    razonSocialCliente VARCHAR(100),
    estadoA BOOLEAN DEFAULT TRUE,
    usuarioA INT,
    FOREIGN KEY (idVenta) REFERENCES Venta(idVenta) ON DELETE CASCADE
);

CREATE TABLE Cancelacion (
    idCancelacion INT AUTO_INCREMENT PRIMARY KEY,
    idVenta INT UNIQUE NOT NULL,
    fechaHora DATETIME NOT NULL,
    estado VARCHAR(50),
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT,
    FOREIGN KEY (idVenta) REFERENCES Venta(idVenta) ON DELETE CASCADE
);

CREATE TABLE Reporte (
    idReporte INT AUTO_INCREMENT PRIMARY KEY,
    idAdministrador INT NOT NULL,
    tipo VARCHAR(100),
    fechaGeneracion DATETIME NOT NULL,
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT,
    FOREIGN KEY (idAdministrador) REFERENCES Usuario(idUsuario)
);

-- BOLETO SIN RELACIÓN DIRECTA A FUNCIÓN (la función se obtiene via Venta)
CREATE TABLE Boleto (
    idBoleto INT AUTO_INCREMENT PRIMARY KEY,
    idAsiento VARCHAR(50) NOT NULL,
    idVenta INT NOT NULL,
    precioPagado DECIMAL(10, 2) NOT NULL,
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT,
    FOREIGN KEY (idAsiento) REFERENCES Asiento(idAsiento),
    FOREIGN KEY (idVenta) REFERENCES Venta(idVenta) ON DELETE CASCADE
);

CREATE TABLE EscanearBoleto (
    idEscaneo INT AUTO_INCREMENT PRIMARY KEY,
    fechaHora DATETIME NOT NULL,
    resultado VARCHAR(100) NOT NULL,
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT,
    idBoleto INT,
    idEncargado INT,
    FOREIGN KEY (idBoleto) REFERENCES Boleto(idBoleto) ON DELETE CASCADE,
    FOREIGN KEY (idEncargado) REFERENCES Usuario(idUsuario) ON DELETE SET NULL
);

CREATE TABLE Auditoria (
    IdAuditoria INT AUTO_INCREMENT PRIMARY KEY,
    TablaNombre VARCHAR(50) NOT NULL,
    RegistroId VARCHAR(50) NOT NULL,
    Accion VARCHAR(50) NOT NULL,
    Campo VARCHAR(100) NULL,
    ValorAnterior LONGTEXT NULL,
    ValorNuevo LONGTEXT NULL,
    UsuarioA INT NULL,
    FechaA DATETIME DEFAULT CURRENT_TIMESTAMP,
    DireccionIP VARCHAR(50) NULL,
    Detalles VARCHAR(500) NULL,
    FOREIGN KEY (UsuarioA) REFERENCES Usuario(idUsuario) ON DELETE SET NULL
);

-- ============================================================
-- FASE 2: DISPARADORES DE AUDITORÍA
-- ============================================================

DELIMITER $$

-- AUDITORÍA: ROL
CREATE TRIGGER tr_Rol_Alta AFTER INSERT ON Rol FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Rol', NEW.idRol, 'INSERT', NULL, CONCAT(NEW.idRol, '|', NEW.nombre, '|', IFNULL(NEW.descripcion, ''), '|', NEW.estadoA), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Rol_Modificacion AFTER UPDATE ON Rol FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Rol', NEW.idRol, 'UPDATE', CONCAT(OLD.idRol, '|', OLD.nombre), CONCAT(NEW.idRol, '|', NEW.nombre), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Rol_Baja AFTER DELETE ON Rol FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Rol', OLD.idRol, 'DELETE', CONCAT(OLD.idRol, '|', OLD.nombre), NULL, OLD.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

-- AUDITORÍA: USUARIO (Incluye NIT y Razón Social)
CREATE TRIGGER tr_Usuario_Alta AFTER INSERT ON Usuario FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Usuario', NEW.idUsuario, 'INSERT', NULL, CONCAT(NEW.nombre1, '|', NEW.apellidoP, '|', NEW.correo, '|NIT:', IFNULL(NEW.nit, 'N/A')), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Usuario_Modificacion AFTER UPDATE ON Usuario FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Usuario', NEW.idUsuario, 'UPDATE', CONCAT(OLD.nombre1, '|', OLD.apellidoP, '|', OLD.estado, '|NIT:', IFNULL(OLD.nit, 'N/A')), CONCAT(NEW.nombre1, '|', NEW.apellidoP, '|', NEW.estado, '|NIT:', IFNULL(NEW.nit, 'N/A')), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Usuario_Baja AFTER DELETE ON Usuario FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Usuario', OLD.idUsuario, 'DELETE', CONCAT(OLD.nombre1, '|', OLD.apellidoP), NULL, OLD.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

-- AUDITORÍA: USUARIO_ROL (Multiroles)
CREATE TRIGGER tr_UsuarioRol_Alta AFTER INSERT ON Usuario_Rol FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Usuario_Rol', CONCAT(NEW.idUsuario, '-', NEW.idRol), 'INSERT', NULL, CONCAT('User:', NEW.idUsuario, '|Rol:', NEW.idRol), NULL, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_UsuarioRol_Baja AFTER DELETE ON Usuario_Rol FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Usuario_Rol', CONCAT(OLD.idUsuario, '-', OLD.idRol), 'DELETE', CONCAT('User:', OLD.idUsuario, '|Rol:', OLD.idRol), NULL, NULL, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

-- AUDITORÍA: PROMOCIÓN
CREATE TRIGGER tr_Promocion_Alta AFTER INSERT ON Promocion FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Promocion', NEW.idPromocion, 'INSERT', NULL, CONCAT(NEW.nombre, '|', IFNULL(NEW.tipo, '')), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Promocion_Modificacion AFTER UPDATE ON Promocion FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Promocion', NEW.idPromocion, 'UPDATE', CONCAT(OLD.nombre, '|', IFNULL(OLD.tipo, '')), CONCAT(NEW.nombre, '|', IFNULL(NEW.tipo, '')), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Promocion_Baja AFTER DELETE ON Promocion FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Promocion', OLD.idPromocion, 'DELETE', CONCAT(OLD.nombre), NULL, OLD.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

-- AUDITORÍA: VENTA (Tabla Fusionada Venta + Pago)
CREATE TRIGGER tr_Venta_Alta AFTER INSERT ON Venta FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Venta', NEW.idVenta, 'INSERT', NULL, CONCAT(NEW.tipo, '|Monto:', NEW.montoTotal, '|EstVenta:', IFNULL(NEW.estadoVenta, ''), '|Metodo:', IFNULL(NEW.metodoPago, ''), '|EstPago:', IFNULL(NEW.estadoPago, '')), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Venta_Modificacion AFTER UPDATE ON Venta FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Venta', NEW.idVenta, 'UPDATE',
            CONCAT(OLD.tipo, '|Monto:', OLD.montoTotal, '|EstVenta:', IFNULL(OLD.estadoVenta, ''), '|EstPago:', IFNULL(OLD.estadoPago, '')),
            CONCAT(NEW.tipo, '|Monto:', NEW.montoTotal, '|EstVenta:', IFNULL(NEW.estadoVenta, ''), '|EstPago:', IFNULL(NEW.estadoPago, '')),
            NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Venta_Baja AFTER DELETE ON Venta FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Venta', OLD.idVenta, 'DELETE', CONCAT(OLD.tipo, '|Monto:', OLD.montoTotal), NULL, OLD.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

-- AUDITORÍA: COMPROBANTE
CREATE TRIGGER tr_Comprobante_Alta AFTER INSERT ON Comprobante FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Comprobante', NEW.idComprobante, 'INSERT', NULL, CONCAT(NEW.numero, '|', IFNULL(NEW.nitCliente, '')), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Comprobante_Baja AFTER DELETE ON Comprobante FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Comprobante', OLD.idComprobante, 'DELETE', CONCAT(OLD.numero), NULL, OLD.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

-- AUDITORÍA: CANCELACIÓN
CREATE TRIGGER tr_Cancelacion_Alta AFTER INSERT ON Cancelacion FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Cancelacion', NEW.idCancelacion, 'INSERT', NULL, CONCAT('Venta:', NEW.idVenta, '|', NEW.estado), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Cancelacion_Baja AFTER DELETE ON Cancelacion FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Cancelacion', OLD.idCancelacion, 'DELETE', CONCAT('Venta:', OLD.idVenta, '|', OLD.estado), NULL, OLD.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

-- AUDITORÍA: REPORTE
CREATE TRIGGER tr_Reporte_Alta AFTER INSERT ON Reporte FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Reporte', NEW.idReporte, 'INSERT', NULL, CONCAT('Admin:', NEW.idAdministrador, '|Tipo:', NEW.tipo), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

-- AUDITORÍA: PELÍCULA
CREATE TRIGGER tr_Pelicula_Alta AFTER INSERT ON Pelicula FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Pelicula', NEW.idPelicula, 'INSERT', NULL, CONCAT(NEW.titulo, '|', IFNULL(NEW.director, ''), '|', IFNULL(NEW.clasificacionEdad, '')), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Pelicula_Modificacion AFTER UPDATE ON Pelicula FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Pelicula', NEW.idPelicula, 'UPDATE', CONCAT(OLD.titulo, '|', IFNULL(OLD.director, '')), CONCAT(NEW.titulo, '|', IFNULL(NEW.director, '')), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Pelicula_Baja AFTER DELETE ON Pelicula FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Pelicula', OLD.idPelicula, 'DELETE', CONCAT(OLD.titulo, '|', IFNULL(OLD.director, '')), NULL, OLD.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

-- AUDITORÍA: SALA
CREATE TRIGGER tr_Sala_Alta AFTER INSERT ON Sala FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Sala', NEW.idSala, 'INSERT', NULL, CONCAT(NEW.tipo, '|Capacidad:', NEW.capacidadTotal), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Sala_Modificacion AFTER UPDATE ON Sala FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Sala', NEW.idSala, 'UPDATE', CONCAT(OLD.tipo, '|Capacidad:', OLD.capacidadTotal), CONCAT(NEW.tipo, '|Capacidad:', NEW.capacidadTotal), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Sala_Baja AFTER DELETE ON Sala FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Sala', OLD.idSala, 'DELETE', CONCAT(OLD.tipo, '|Capacidad:', OLD.capacidadTotal), NULL, OLD.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

-- AUDITORÍA: ASIENTO
CREATE TRIGGER tr_Asiento_Alta AFTER INSERT ON Asiento FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Asiento', NEW.idAsiento, 'INSERT', NULL, CONCAT(NEW.fila, NEW.columna, '|Sala:', NEW.idSala), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Asiento_Modificacion AFTER UPDATE ON Asiento FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Asiento', NEW.idAsiento, 'UPDATE', CONCAT(OLD.fila, OLD.columna, '|Estado:', OLD.estado), CONCAT(NEW.fila, NEW.columna, '|Estado:', NEW.estado), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Asiento_Baja AFTER DELETE ON Asiento FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Asiento', OLD.idAsiento, 'DELETE', CONCAT(OLD.fila, OLD.columna, '|Sala:', OLD.idSala), NULL, OLD.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

-- AUDITORÍA: FUNCIÓN
CREATE TRIGGER tr_Funcion_Alta AFTER INSERT ON Funcion FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Funcion', NEW.idFuncion, 'INSERT', NULL, CONCAT('Sala:', NEW.idSala, '|Fecha:', NEW.fecha, '|Hora:', NEW.horaInicio, '|Precio:', NEW.precioBase), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Funcion_Modificacion AFTER UPDATE ON Funcion FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Funcion', NEW.idFuncion, 'UPDATE', CONCAT('Hora:', OLD.horaInicio, '|Precio:', OLD.precioBase), CONCAT('Hora:', NEW.horaInicio, '|Precio:', NEW.precioBase), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Funcion_Baja AFTER DELETE ON Funcion FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Funcion', OLD.idFuncion, 'DELETE', CONCAT('Sala:', OLD.idSala, '|Fecha:', OLD.fecha, '|Hora:', OLD.horaInicio), NULL, OLD.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

-- AUDITORÍA: BOLETO (Sin rastro de idFuncion)
CREATE TRIGGER tr_Boleto_Alta AFTER INSERT ON Boleto FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Boleto', NEW.idBoleto, 'INSERT', NULL, CONCAT('Asiento:', NEW.idAsiento, '|Venta:', NEW.idVenta, '|PrecioPagado:', NEW.precioPagado), NEW.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Boleto_Baja AFTER DELETE ON Boleto FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Boleto', OLD.idBoleto, 'DELETE', CONCAT('Asiento:', OLD.idAsiento, '|Venta:', OLD.idVenta, '|PrecioPagado:', OLD.precioPagado), NULL, OLD.usuarioA, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

DELIMITER ;

-- ============================================================
-- FASE 3: SEED DATA - CINE LA PAZ
-- ============================================================

-- 3.1 ROLES
INSERT INTO Rol (idRol, nombre, descripcion) VALUES
('ADMINISTRADOR', 'Administrador', 'Control total del sistema'),
('BOLETERIA', 'Encargado de Boletería', 'Gestión de ventas presenciales y registro de clientes'),
('CLIENTE', 'Cliente', 'Cliente del cine con acceso al portal web'),
('ACCESO', 'Encargado de Acceso', 'Control de acceso a salas mediante validación de boletos QR');

-- 3.2 USUARIOS (contraseñas hasheadas con bcrypt, rounds=10)
INSERT INTO Usuario (nombre1, nombre2, apellidoP, apellidoM, ci, correo, telefono, fechaNacimiento, contrasena, nit, razonSocial) VALUES
('Admin', NULL, 'General', NULL, '1234567', 'admin@cinelapaz.com', '76543210', '1985-03-15', '$2a$10$nGiF8Yjg26jMfvB.RjnpR.XJz5l.x3VJ4b9K1GrSAQfY.ZB1DhCWm', NULL, NULL),
('María', 'Elena', 'Gonzales', 'Mamani', '7890123', 'boleteria@cinelapaz.com', '76543211', '1990-07-22', '$2a$10$dAeDvl5.boGs.U792xkdWeT5cRFMGqN42ljMXvr/bIQNex.5jFkWq', NULL, NULL),
('Carlos', NULL, 'Mamani', 'Condori', '4567890', 'cliente@cinelapaz.com', '71234567', '1995-01-10', '$2a$10$ELf79l9fQJMWiKLtM0vwk.ZZ6oaQIz5NwWhycwO2Zew8c6I5v.Rea', '4567890', 'Carlos Mamani Condori'),
('Ana', 'Lucía', 'Flores', 'Ríos', '5678901', 'ana.flores@email.com', '72345678', '1998-06-15', '$2a$10$ELf79l9fQJMWiKLtM0vwk.ZZ6oaQIz5NwWhycwO2Zew8c6I5v.Rea', '5678901', 'Ana Lucía Flores Ríos'),
('Luis', NULL, 'Quispe', 'Torres', '6789012', 'luis.quispe@email.com', '73456789', '1992-11-20', '$2a$10$ELf79l9fQJMWiKLtM0vwk.ZZ6oaQIz5NwWhycwO2Zew8c6I5v.Rea', '6789012', 'Luis Quispe Torres'),
('María', 'Fernanda', 'Vargas', 'López', '7890124', 'maria.vargas@email.com', '74567890', '2000-03-08', '$2a$10$ELf79l9fQJMWiKLtM0vwk.ZZ6oaQIz5NwWhycwO2Zew8c6I5v.Rea', '7890124', 'María Fernanda Vargas López'),
('Pedro', NULL, 'Huanca', 'Ramos', '8901234', 'pedro.huanca@email.com', '75678901', '1988-09-25', '$2a$10$ELf79l9fQJMWiKLtM0vwk.ZZ6oaQIz5NwWhycwO2Zew8c6I5v.Rea', '8901234', 'Pedro Huanca Ramos'),
('Jorge', NULL, 'Mendoza', 'Perez', '9012345', 'acceso@cinelapaz.com', '76543212', '1992-05-14', '$2a$10$dAeDvl5.boGs.U792xkdWeT5cRFMGqN42ljMXvr/bIQNex.5jFkWq', NULL, NULL);

-- 3.3 USUARIO_ROL (Multiroles)
INSERT INTO Usuario_Rol (idUsuario, idRol) VALUES
(1, 'ADMINISTRADOR'),
(2, 'BOLETERIA'),
(3, 'CLIENTE'),
(4, 'CLIENTE'),
(5, 'CLIENTE'),
(6, 'CLIENTE'),
(7, 'CLIENTE'),
(8, 'ACCESO');

-- 3.4 SALAS
INSERT INTO Sala (idSala, tipo, capacidadTotal, filas, columnas) VALUES
('SALA-1', 'Estándar', 80, 8, 10),
('SALA-2', '3D', 96, 8, 12),
('SALA-3', 'VIP', 48, 6, 8),
('SALA-4', 'Estándar', 120, 10, 12);

-- 3.5 ASIENTOS (generados para cada sala)
-- SALA-1: 8 filas (A-H) x 10 columnas
INSERT INTO Asiento (idAsiento, idSala, fila, columna) VALUES
('SALA-1-A1','SALA-1','A',1),('SALA-1-A2','SALA-1','A',2),('SALA-1-A3','SALA-1','A',3),('SALA-1-A4','SALA-1','A',4),('SALA-1-A5','SALA-1','A',5),('SALA-1-A6','SALA-1','A',6),('SALA-1-A7','SALA-1','A',7),('SALA-1-A8','SALA-1','A',8),('SALA-1-A9','SALA-1','A',9),('SALA-1-A10','SALA-1','A',10),
('SALA-1-B1','SALA-1','B',1),('SALA-1-B2','SALA-1','B',2),('SALA-1-B3','SALA-1','B',3),('SALA-1-B4','SALA-1','B',4),('SALA-1-B5','SALA-1','B',5),('SALA-1-B6','SALA-1','B',6),('SALA-1-B7','SALA-1','B',7),('SALA-1-B8','SALA-1','B',8),('SALA-1-B9','SALA-1','B',9),('SALA-1-B10','SALA-1','B',10),
('SALA-1-C1','SALA-1','C',1),('SALA-1-C2','SALA-1','C',2),('SALA-1-C3','SALA-1','C',3),('SALA-1-C4','SALA-1','C',4),('SALA-1-C5','SALA-1','C',5),('SALA-1-C6','SALA-1','C',6),('SALA-1-C7','SALA-1','C',7),('SALA-1-C8','SALA-1','C',8),('SALA-1-C9','SALA-1','C',9),('SALA-1-C10','SALA-1','C',10),
('SALA-1-D1','SALA-1','D',1),('SALA-1-D2','SALA-1','D',2),('SALA-1-D3','SALA-1','D',3),('SALA-1-D4','SALA-1','D',4),('SALA-1-D5','SALA-1','D',5),('SALA-1-D6','SALA-1','D',6),('SALA-1-D7','SALA-1','D',7),('SALA-1-D8','SALA-1','D',8),('SALA-1-D9','SALA-1','D',9),('SALA-1-D10','SALA-1','D',10),
('SALA-1-E1','SALA-1','E',1),('SALA-1-E2','SALA-1','E',2),('SALA-1-E3','SALA-1','E',3),('SALA-1-E4','SALA-1','E',4),('SALA-1-E5','SALA-1','E',5),('SALA-1-E6','SALA-1','E',6),('SALA-1-E7','SALA-1','E',7),('SALA-1-E8','SALA-1','E',8),('SALA-1-E9','SALA-1','E',9),('SALA-1-E10','SALA-1','E',10),
('SALA-1-F1','SALA-1','F',1),('SALA-1-F2','SALA-1','F',2),('SALA-1-F3','SALA-1','F',3),('SALA-1-F4','SALA-1','F',4),('SALA-1-F5','SALA-1','F',5),('SALA-1-F6','SALA-1','F',6),('SALA-1-F7','SALA-1','F',7),('SALA-1-F8','SALA-1','F',8),('SALA-1-F9','SALA-1','F',9),('SALA-1-F10','SALA-1','F',10),
('SALA-1-G1','SALA-1','G',1),('SALA-1-G2','SALA-1','G',2),('SALA-1-G3','SALA-1','G',3),('SALA-1-G4','SALA-1','G',4),('SALA-1-G5','SALA-1','G',5),('SALA-1-G6','SALA-1','G',6),('SALA-1-G7','SALA-1','G',7),('SALA-1-G8','SALA-1','G',8),('SALA-1-G9','SALA-1','G',9),('SALA-1-G10','SALA-1','G',10),
('SALA-1-H1','SALA-1','H',1),('SALA-1-H2','SALA-1','H',2),('SALA-1-H3','SALA-1','H',3),('SALA-1-H4','SALA-1','H',4),('SALA-1-H5','SALA-1','H',5),('SALA-1-H6','SALA-1','H',6),('SALA-1-H7','SALA-1','H',7),('SALA-1-H8','SALA-1','H',8),('SALA-1-H9','SALA-1','H',9),('SALA-1-H10','SALA-1','H',10);

-- SALA-2: 8 filas (A-H) x 12 columnas
INSERT INTO Asiento (idAsiento, idSala, fila, columna)
SELECT CONCAT('SALA-2-', f.letra, n.num), 'SALA-2', f.letra, n.num
FROM (SELECT 'A' AS letra UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H') f
CROSS JOIN (SELECT 1 AS num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12) n;

-- SALA-3: 6 filas (A-F) x 8 columnas
INSERT INTO Asiento (idAsiento, idSala, fila, columna)
SELECT CONCAT('SALA-3-', f.letra, n.num), 'SALA-3', f.letra, n.num
FROM (SELECT 'A' AS letra UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F') f
CROSS JOIN (SELECT 1 AS num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8) n;

-- SALA-4: 10 filas (A-J) x 12 columnas
INSERT INTO Asiento (idAsiento, idSala, fila, columna)
SELECT CONCAT('SALA-4-', f.letra, n.num), 'SALA-4', f.letra, n.num
FROM (SELECT 'A' AS letra UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D' UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H' UNION SELECT 'I' UNION SELECT 'J') f
CROSS JOIN (SELECT 1 AS num UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12) n;

-- 3.6 PELÍCULAS
INSERT INTO Pelicula (titulo, director, sinopsis, posterUrl, duracionMinutos, clasificacionEdad, fechaEstreno) VALUES
('Inside Out 2', 'Kelsey Mann', 'Riley entra en la adolescencia y nuevas emociones llegan a la cabeza: Ansiedad, Vergüenza, Aburrimiento y Envy.', 'https://image.tmdb.org/t/p/w500/vpnVM9B6NMmQpWeZvzLvDESb2QY.jpg', 100, 'TP', '2024-06-14'),
('Deadpool & Wolverine', 'Shawn Levy', 'Wade Wilson se ve forzado a unirse a Wolverine en una misión para salvar su tiempo-lineal.', 'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4t6EDMubfO.jpg', 128, '16', '2024-07-26'),
('Gladiator II', 'Ridley Scott', 'Lucio, hijo de Máximo, se ve obligado a luchar en el Coliseo mientras busca venganza contra el emperador.', 'https://image.tmdb.org/t/p/w500/2cxhvwyEwRlysAmRH4iodkvo0z5.jpg', 148, '16', '2024-11-22'),
('Moana 2', 'David Derrick Jr.', 'Moana viaja a mares lejanos después de recibir una llamada inesperada de sus ancestros.', 'https://image.tmdb.org/t/p/w500/aLVkiINlIeCkcZIzb7XHzPYvO7u.jpg', 100, 'TP', '2024-11-27'),
('Wicked', 'Jon M. Chu', 'La historia de las brujas de Oz antes de que Dorothy llegara, centrándose en Elphaba y Glinda.', 'https://image.tmdb.org/t/p/w500/xDGbZ0JJREmLdE3Mhe9aX7YQ0iD.jpg', 160, 'TP', '2024-11-22'),
('Nosferatu', 'Robert Eggers', 'Una obsesión gótica entre una joven y el antiguo vampiro Orlok en la Europa del siglo XIX.', 'https://image.tmdb.org/t/p/w500/5qGIxdEO841C0tPreYfUGK0SfgW.jpg', 132, '18', '2024-12-25'),
('Mufasa: El Rey León', 'Barry Jenkins', 'La historia de cómo Mufasa se convirtió en rey, narrada por Rafiki.', 'https://image.tmdb.org/t/p/w500/lurEK87kukWNaHd0zYnsi3yzJrs.jpg', 118, 'TP', '2024-12-20'),
('Sonic 3: La Película', 'Jeff Fowler', 'Sonic y sus amigos se enfrentan a un nuevo y poderoso rival: Shadow the Hedgehog.', 'https://image.tmdb.org/t/p/w500/d8Ryb8AunYAuycVKDp5HpdWPKgC.jpg', 110, 'TP', '2024-12-20'),
('El Señor de los Anillos: La Guerra de los Rohirrim', 'Kenji Kamiyama', 'La historia de Helm Martillo y la guerra de los Rohirrim contra los Dunlendinos.', 'https://image.tmdb.org/t/p/w500/cTf9sHcRCB9g0Ml7SfW1z0hRy5n.jpg', 134, '13', '2024-12-13'),
('A Complete Unknown', 'James Mangold', 'La historia de Bob Dylan y su impacto en la música de los años 60.', 'https://image.tmdb.org/t/p/w500/ao1E7SxR1iHbc14CynRzI1zRc4o.jpg', 141, '13', '2024-12-25'),
('Captain America: Brave New World', 'Julius Onah', 'Sam Wilson, el nuevo Capitán América, se enfrenta a una amenaza global.', 'https://image.tmdb.org/t/p/w500/pzItpT4fZpAGqzIVCe2SrJQA4Tt.jpg', 130, '13', '2025-02-14'),
('The Brutalist', 'Brady Corbet', 'Un arquitecto húngaro sobreviviente del Holocausto emigra a Estados Unidos y busca reconstruir su vida.', 'https://image.tmdb.org/t/p/w500/d9JW3rYflRbIVqJTL5sEaOIR0s.jpg', 215, '16', '2024-12-20');

-- 3.7 FUNCIONES (7 días, horarios Bolivia: 14:00, 16:30, 19:00, 21:30)
-- Precios: Estándar=20, 3D=30, VIP=40

-- HOY
INSERT INTO Funcion (idSala, idPelicula, fecha, horaInicio, horaFin, precioBase) VALUES
('SALA-1', 1, CURDATE(), '14:00:00', '15:40:00', 20.00),
('SALA-1', 2, CURDATE(), '16:30:00', '18:38:00', 20.00),
('SALA-2', 3, CURDATE(), '14:00:00', '16:28:00', 30.00),
('SALA-2', 4, CURDATE(), '19:00:00', '20:40:00', 30.00),
('SALA-3', 5, CURDATE(), '14:00:00', '16:40:00', 40.00),
('SALA-3', 6, CURDATE(), '19:00:00', '21:12:00', 40.00),
('SALA-4', 7, CURDATE(), '14:00:00', '15:58:00', 20.00),
('SALA-4', 8, CURDATE(), '16:30:00', '18:20:00', 20.00),
('SALA-4', 9, CURDATE(), '19:00:00', '21:14:00', 20.00);

-- MAÑANA +1
INSERT INTO Funcion (idSala, idPelicula, fecha, horaInicio, horaFin, precioBase) VALUES
('SALA-1', 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '14:00:00', '15:40:00', 20.00),
('SALA-1', 3, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '16:30:00', '18:58:00', 20.00),
('SALA-2', 2, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '14:00:00', '16:08:00', 30.00),
('SALA-2', 5, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '19:00:00', '21:40:00', 30.00),
('SALA-3', 4, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '14:00:00', '15:40:00', 40.00),
('SALA-3', 7, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '19:00:00', '20:58:00', 40.00),
('SALA-4', 6, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '14:00:00', '16:12:00', 20.00),
('SALA-4', 8, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '16:30:00', '18:20:00', 20.00),
('SALA-4', 10, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '19:00:00', '21:21:00', 20.00);

-- +2
INSERT INTO Funcion (idSala, idPelicula, fecha, horaInicio, horaFin, precioBase) VALUES
('SALA-1', 4, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '14:00:00', '15:40:00', 20.00),
('SALA-1', 6, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '19:00:00', '21:12:00', 20.00),
('SALA-2', 1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '14:00:00', '15:40:00', 30.00),
('SALA-2', 3, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '16:30:00', '18:58:00', 30.00),
('SALA-3', 2, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '14:00:00', '16:08:00', 40.00),
('SALA-4', 5, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '14:00:00', '16:40:00', 20.00),
('SALA-4', 9, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '16:30:00', '18:44:00', 20.00),
('SALA-4', 11, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '19:00:00', '21:10:00', 20.00);

-- +3
INSERT INTO Funcion (idSala, idPelicula, fecha, horaInicio, horaFin, precioBase) VALUES
('SALA-1', 7, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '14:00:00', '15:58:00', 20.00),
('SALA-1', 2, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '19:00:00', '21:08:00', 20.00),
('SALA-2', 5, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '14:00:00', '16:40:00', 30.00),
('SALA-2', 8, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '19:00:00', '20:50:00', 30.00),
('SALA-3', 3, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '14:00:00', '16:28:00', 40.00),
('SALA-3', 10, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '19:00:00', '21:21:00', 40.00),
('SALA-4', 1, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '14:00:00', '15:40:00', 20.00),
('SALA-4', 4, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '16:30:00', '18:10:00', 20.00);

-- +4
INSERT INTO Funcion (idSala, idPelicula, fecha, horaInicio, horaFin, precioBase) VALUES
('SALA-1', 9, DATE_ADD(CURDATE(), INTERVAL 4 DAY), '14:00:00', '16:14:00', 20.00),
('SALA-1', 11, DATE_ADD(CURDATE(), INTERVAL 4 DAY), '19:00:00', '21:10:00', 20.00),
('SALA-2', 6, DATE_ADD(CURDATE(), INTERVAL 4 DAY), '14:00:00', '16:12:00', 30.00),
('SALA-2', 12, DATE_ADD(CURDATE(), INTERVAL 4 DAY), '19:00:00', '22:35:00', 30.00),
('SALA-3', 8, DATE_ADD(CURDATE(), INTERVAL 4 DAY), '14:00:00', '15:50:00', 40.00),
('SALA-4', 2, DATE_ADD(CURDATE(), INTERVAL 4 DAY), '14:00:00', '16:08:00', 20.00),
('SALA-4', 7, DATE_ADD(CURDATE(), INTERVAL 4 DAY), '16:30:00', '18:28:00', 20.00),
('SALA-4', 3, DATE_ADD(CURDATE(), INTERVAL 4 DAY), '19:00:00', '21:28:00', 20.00);

-- +5
INSERT INTO Funcion (idSala, idPelicula, fecha, horaInicio, horaFin, precioBase) VALUES
('SALA-1', 10, DATE_ADD(CURDATE(), INTERVAL 5 DAY), '14:00:00', '16:21:00', 20.00),
('SALA-1', 4, DATE_ADD(CURDATE(), INTERVAL 5 DAY), '19:00:00', '20:40:00', 20.00),
('SALA-2', 7, DATE_ADD(CURDATE(), INTERVAL 5 DAY), '14:00:00', '15:58:00', 30.00),
('SALA-2', 1, DATE_ADD(CURDATE(), INTERVAL 5 DAY), '16:30:00', '18:10:00', 30.00),
('SALA-3', 12, DATE_ADD(CURDATE(), INTERVAL 5 DAY), '14:00:00', '17:35:00', 40.00),
('SALA-4', 6, DATE_ADD(CURDATE(), INTERVAL 5 DAY), '14:00:00', '16:12:00', 20.00),
('SALA-4', 5, DATE_ADD(CURDATE(), INTERVAL 5 DAY), '16:30:00', '19:10:00', 20.00);

-- +6
INSERT INTO Funcion (idSala, idPelicula, fecha, horaInicio, horaFin, precioBase) VALUES
('SALA-1', 8, DATE_ADD(CURDATE(), INTERVAL 6 DAY), '14:00:00', '15:50:00', 20.00),
('SALA-1', 6, DATE_ADD(CURDATE(), INTERVAL 6 DAY), '19:00:00', '21:12:00', 20.00),
('SALA-2', 11, DATE_ADD(CURDATE(), INTERVAL 6 DAY), '14:00:00', '16:10:00', 30.00),
('SALA-2', 9, DATE_ADD(CURDATE(), INTERVAL 6 DAY), '19:00:00', '21:14:00', 30.00),
('SALA-3', 1, DATE_ADD(CURDATE(), INTERVAL 6 DAY), '14:00:00', '15:40:00', 40.00),
('SALA-3', 3, DATE_ADD(CURDATE(), INTERVAL 6 DAY), '16:30:00', '18:58:00', 40.00),
('SALA-4', 12, DATE_ADD(CURDATE(), INTERVAL 6 DAY), '14:00:00', '17:35:00', 20.00),
('SALA-4', 2, DATE_ADD(CURDATE(), INTERVAL 6 DAY), '19:00:00', '21:08:00', 20.00);

-- 3.8 VENTAS (compras de clientes en diferentes días y funciones)
INSERT INTO Venta (idCliente, idEncargado, idFuncion, fechaCompra, tipo, montoTotal, estadoVenta, metodoPago, estadoPago, codigoTransaccion, fechaPago) VALUES
-- VentasOnline (clientes compraron por web)
(3, NULL, 1, DATE_SUB(NOW(), INTERVAL 6 DAY), 'ONLINE', 40.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-001', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(4, NULL, 1, DATE_SUB(NOW(), INTERVAL 6 DAY), 'ONLINE', 20.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-002', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(5, NULL, 2, DATE_SUB(NOW(), INTERVAL 6 DAY), 'ONLINE', 60.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-003', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(6, NULL, 3, DATE_SUB(NOW(), INTERVAL 6 DAY), 'ONLINE', 30.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-004', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(7, NULL, 5, DATE_SUB(NOW(), INTERVAL 6 DAY), 'ONLINE', 80.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-005', DATE_SUB(NOW(), INTERVAL 6 DAY)),
-- Ventas presenciales (boletería)
(3, 2, 7, DATE_SUB(NOW(), INTERVAL 6 DAY), 'PRESENCIAL', 40.00, 'COMPLETADA', 'EFECTIVO', 'APROBADO', 'EF-001', DATE_SUB(NOW(), INTERVAL 6 DAY)),
(4, 2, 9, DATE_SUB(NOW(), INTERVAL 6 DAY), 'PRESENCIAL', 20.00, 'COMPLETADA', 'EFECTIVO', 'APROBADO', 'EF-002', DATE_SUB(NOW(), INTERVAL 6 DAY)),
-- Día -5
(3, NULL, 10, DATE_SUB(NOW(), INTERVAL 5 DAY), 'ONLINE', 60.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-006', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(5, NULL, 10, DATE_SUB(NOW(), INTERVAL 5 DAY), 'ONLINE', 40.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-007', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(6, NULL, 11, DATE_SUB(NOW(), INTERVAL 5 DAY), 'ONLINE', 90.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-008', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(7, NULL, 12, DATE_SUB(NOW(), INTERVAL 5 DAY), 'ONLINE', 60.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-009', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(4, 2, 13, DATE_SUB(NOW(), INTERVAL 5 DAY), 'PRESENCIAL', 80.00, 'COMPLETADA', 'EFECTIVO', 'APROBADO', 'EF-003', DATE_SUB(NOW(), INTERVAL 5 DAY)),
(3, 2, 16, DATE_SUB(NOW(), INTERVAL 5 DAY), 'PRESENCIAL', 40.00, 'COMPLETADA', 'EFECTIVO', 'APROBADO', 'EF-004', DATE_SUB(NOW(), INTERVAL 5 DAY)),
-- Día -4
(5, NULL, 19, DATE_SUB(NOW(), INTERVAL 4 DAY), 'ONLINE', 60.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-010', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(6, NULL, 19, DATE_SUB(NOW(), INTERVAL 4 DAY), 'ONLINE', 30.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-011', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(7, NULL, 20, DATE_SUB(NOW(), INTERVAL 4 DAY), 'ONLINE', 40.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-012', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(3, NULL, 21, DATE_SUB(NOW(), INTERVAL 4 DAY), 'ONLINE', 120.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-013', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(4, NULL, 22, DATE_SUB(NOW(), INTERVAL 4 DAY), 'ONLINE', 60.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-014', DATE_SUB(NOW(), INTERVAL 4 DAY)),
(5, 2, 25, DATE_SUB(NOW(), INTERVAL 4 DAY), 'PRESENCIAL', 80.00, 'COMPLETADA', 'EFECTIVO', 'APROBADO', 'EF-005', DATE_SUB(NOW(), INTERVAL 4 DAY)),
-- Día -3
(6, NULL, 28, DATE_SUB(NOW(), INTERVAL 3 DAY), 'ONLINE', 40.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-015', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(7, NULL, 29, DATE_SUB(NOW(), INTERVAL 3 DAY), 'ONLINE', 60.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-016', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(3, NULL, 30, DATE_SUB(NOW(), INTERVAL 3 DAY), 'ONLINE', 30.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-017', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(4, NULL, 31, DATE_SUB(NOW(), INTERVAL 3 DAY), 'ONLINE', 40.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-018', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(5, NULL, 32, DATE_SUB(NOW(), INTERVAL 3 DAY), 'ONLINE', 120.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-019', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(6, 2, 34, DATE_SUB(NOW(), INTERVAL 3 DAY), 'PRESENCIAL', 40.00, 'COMPLETADA', 'EFECTIVO', 'APROBADO', 'EF-006', DATE_SUB(NOW(), INTERVAL 3 DAY)),
(7, 2, 36, DATE_SUB(NOW(), INTERVAL 3 DAY), 'PRESENCIAL', 80.00, 'COMPLETADA', 'EFECTIVO', 'APROBADO', 'EF-007', DATE_SUB(NOW(), INTERVAL 3 DAY)),
-- Día -2
(3, NULL, 37, DATE_SUB(NOW(), INTERVAL 2 DAY), 'ONLINE', 60.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-020', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(4, NULL, 38, DATE_SUB(NOW(), INTERVAL 2 DAY), 'ONLINE', 40.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-021', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(5, NULL, 39, DATE_SUB(NOW(), INTERVAL 2 DAY), 'ONLINE', 90.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-022', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(6, NULL, 40, DATE_SUB(NOW(), INTERVAL 2 DAY), 'ONLINE', 30.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-023', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(7, NULL, 41, DATE_SUB(NOW(), INTERVAL 2 DAY), 'ONLINE', 40.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-024', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(3, 2, 43, DATE_SUB(NOW(), INTERVAL 2 DAY), 'PRESENCIAL', 80.00, 'COMPLETADA', 'EFECTIVO', 'APROBADO', 'EF-008', DATE_SUB(NOW(), INTERVAL 2 DAY)),
(4, 2, 44, DATE_SUB(NOW(), INTERVAL 2 DAY), 'PRESENCIAL', 60.00, 'COMPLETADA', 'EFECTIVO', 'APROBADO', 'EF-009', DATE_SUB(NOW(), INTERVAL 2 DAY)),
-- Día -1
(5, NULL, 46, DATE_SUB(NOW(), INTERVAL 1 DAY), 'ONLINE', 40.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-025', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(6, NULL, 47, DATE_SUB(NOW(), INTERVAL 1 DAY), 'ONLINE', 60.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-026', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(7, NULL, 48, DATE_SUB(NOW(), INTERVAL 1 DAY), 'ONLINE', 30.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-027', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(3, NULL, 49, DATE_SUB(NOW(), INTERVAL 1 DAY), 'ONLINE', 120.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-028', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(4, NULL, 50, DATE_SUB(NOW(), INTERVAL 1 DAY), 'ONLINE', 60.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-029', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(5, 2, 52, DATE_SUB(NOW(), INTERVAL 1 DAY), 'PRESENCIAL', 80.00, 'COMPLETADA', 'EFECTIVO', 'APROBADO', 'EF-010', DATE_SUB(NOW(), INTERVAL 1 DAY)),
(6, 2, 55, DATE_SUB(NOW(), INTERVAL 1 DAY), 'PRESENCIAL', 40.00, 'COMPLETADA', 'EFECTIVO', 'APROBADO', 'EF-011', DATE_SUB(NOW(), INTERVAL 1 DAY)),
-- HOY (algunas ventas)
(7, NULL, 50, NOW(), 'ONLINE', 40.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-030', NOW()),
(3, NULL, 51, NOW(), 'ONLINE', 60.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-031', NOW()),
(4, 2, 52, NOW(), 'PRESENCIAL', 90.00, 'COMPLETADA', 'EFECTIVO', 'APROBADO', 'EF-012', NOW()),
(5, 2, 55, NOW(), 'PRESENCIAL', 40.00, 'COMPLETADA', 'EFECTIVO', 'APROBADO', 'EF-013', NOW()),
(6, NULL, 53, NOW(), 'ONLINE', 30.00, 'COMPLETADA', 'QR', 'APROBADO', 'QR-ON-032', NOW()),
(7, 2, 54, NOW(), 'PRESENCIAL', 60.00, 'COMPLETADA', 'EFECTIVO', 'APROBADO', 'EF-014', NOW());

-- 3.9 BOLETOS (un boleto por cada asiento vendido)
-- Función 1 (HOY, Inside Out 2, SALA-1, precio=20) — 2 ventas = 5 boletos
INSERT INTO Boleto (idAsiento, idVenta, precioPagado) VALUES
('SALA-1-A1', 1, 20.00), ('SALA-1-A2', 1, 20.00),
('SALA-1-B1', 2, 20.00),
('SALA-1-C1', 3, 20.00), ('SALA-1-C2', 3, 20.00), ('SALA-1-C3', 3, 20.00);

-- Función 2 (HOY, Deadpool, SALA-1, precio=20) — 1 venta = 3 boletos
INSERT INTO Boleto (idAsiento, idVenta, precioPagado) VALUES
('SALA-1-D1', 4, 20.00), ('SALA-1-D2', 4, 20.00), ('SALA-1-D3', 4, 20.00);

-- Función 3 (HOY, Gladiator II, SALA-2, precio=30) — 1 venta = 1 boleto
INSERT INTO Boleto (idAsiento, idVenta, precioPagado) VALUES
('SALA-2-A1', 5, 30.00);

-- Función 5 (HOY, Wicked, SALA-3, precio=40) — 1 venta = 2 boletos
INSERT INTO Boleto (idAsiento, idVenta, precioPagado) VALUES
('SALA-3-A1', 6, 40.00), ('SALA-3-A2', 6, 40.00);

-- Función 7 (HOY, Mufasa, SALA-4, precio=20) — 1 venta = 2 boletos
INSERT INTO Boleto (idAsiento, idVenta, precioPagado) VALUES
('SALA-4-A1', 7, 20.00), ('SALA-4-A2', 7, 20.00);

-- Función 9 (HOY, Sonic 3, SALA-4, precio=20) — 1 venta = 1 boleto
INSERT INTO Boleto (idAsiento, idVenta, precioPagado) VALUES
('SALA-4-B1', 8, 20.00);

-- Día -5 (funciones 10-18)
INSERT INTO Boleto (idAsiento, idVenta, precioPagado) VALUES
('SALA-1-E1', 9, 20.00), ('SALA-1-E2', 9, 20.00), ('SALA-1-E3', 9, 20.00),
('SALA-1-F1', 10, 20.00), ('SALA-1-F2', 10, 20.00),
('SALA-2-B1', 11, 30.00), ('SALA-2-B2', 11, 30.00), ('SALA-2-B3', 11, 30.00),
('SALA-2-C1', 12, 30.00), ('SALA-2-C2', 12, 30.00),
('SALA-3-B1', 13, 40.00), ('SALA-3-B2', 13, 40.00), ('SALA-3-B3', 13, 40.00), ('SALA-3-B4', 13, 40.00),
('SALA-4-C1', 14, 20.00), ('SALA-4-C2', 14, 20.00);

-- Día -4 (funciones 19-26)
INSERT INTO Boleto (idAsiento, idVenta, precioPagado) VALUES
('SALA-2-D1', 15, 30.00), ('SALA-2-D2', 15, 30.00), ('SALA-2-D3', 15, 30.00),
('SALA-2-E1', 16, 30.00),
('SALA-1-G1', 17, 20.00), ('SALA-1-G2', 17, 20.00),
('SALA-3-C1', 18, 40.00), ('SALA-3-C2', 18, 40.00), ('SALA-3-C3', 18, 40.00), ('SALA-3-C4', 18, 40.00),
('SALA-4-D1', 19, 20.00), ('SALA-4-D2', 19, 20.00), ('SALA-4-D3', 19, 20.00),
('SALA-4-E1', 20, 40.00), ('SALA-4-E2', 20, 40.00);

-- Día -3 (funciones 28-36)
INSERT INTO Boleto (idAsiento, idVenta, precioPagado) VALUES
('SALA-1-H1', 21, 20.00), ('SALA-1-H2', 21, 20.00),
('SALA-2-F1', 22, 30.00), ('SALA-2-F2', 22, 30.00), ('SALA-2-F3', 22, 30.00),
('SALA-3-D1', 23, 40.00),
('SALA-4-F1', 24, 20.00), ('SALA-4-F2', 24, 20.00),
('SALA-4-G1', 25, 60.00), ('SALA-4-G2', 25, 60.00),
('SALA-4-H1', 26, 20.00), ('SALA-4-H2', 26, 20.00),
('SALA-3-E1', 27, 40.00), ('SALA-3-E2', 27, 40.00), ('SALA-3-E3', 27, 40.00), ('SALA-3-E4', 27, 40.00);

-- Día -2 (funciones 37-44)
INSERT INTO Boleto (idAsiento, idVenta, precioPagado) VALUES
('SALA-1-A3', 28, 20.00), ('SALA-1-A4', 28, 20.00), ('SALA-1-A5', 28, 20.00),
('SALA-1-B3', 29, 20.00), ('SALA-1-B4', 29, 20.00),
('SALA-2-G1', 30, 30.00), ('SALA-2-G2', 30, 30.00), ('SALA-2-G3', 30, 30.00),
('SALA-3-F1', 31, 40.00),
('SALA-4-I1', 32, 20.00), ('SALA-4-I2', 32, 20.00),
('SALA-4-J1', 33, 40.00), ('SALA-4-J2', 33, 40.00),
('SALA-1-C4', 34, 20.00), ('SALA-1-C5', 34, 20.00), ('SALA-1-C6', 34, 20.00), ('SALA-1-C7', 34, 20.00),
('SALA-2-H1', 35, 30.00), ('SALA-2-H2', 35, 30.00), ('SALA-2-H3', 35, 30.00);

-- Día -1 (funciones 43-49)
INSERT INTO Boleto (idAsiento, idVenta, precioPagado) VALUES
('SALA-1-D4', 36, 20.00), ('SALA-1-D5', 36, 20.00),
('SALA-1-E4', 37, 20.00), ('SALA-1-E5', 37, 20.00), ('SALA-1-E6', 37, 20.00),
('SALA-2-F4', 38, 30.00),
('SALA-3-A3', 39, 40.00), ('SALA-3-A4', 39, 40.00), ('SALA-3-A5', 39, 40.00), ('SALA-3-A6', 39, 40.00),
('SALA-4-D3', 40, 20.00), ('SALA-4-D4', 40, 20.00), ('SALA-4-D5', 40, 20.00),
('SALA-4-E3', 41, 20.00), ('SALA-4-E4', 41, 20.00),
('SALA-3-B5', 42, 40.00), ('SALA-3-B6', 42, 40.00);

-- HOY (funciones 50-57)
INSERT INTO Boleto (idAsiento, idVenta, precioPagado) VALUES
('SALA-1-F3', 43, 20.00), ('SALA-1-F4', 43, 20.00),
('SALA-1-G3', 44, 20.00), ('SALA-1-G4', 44, 20.00), ('SALA-1-G5', 44, 20.00),
('SALA-2-H4', 45, 30.00), ('SALA-2-H5', 45, 30.00), ('SALA-2-H6', 45, 30.00), ('SALA-2-H7', 45, 30.00),
('SALA-3-F1', 46, 40.00), ('SALA-3-F2', 46, 40.00);

-- 3.10 COMPROBANTES (uno por cada venta)
INSERT INTO Comprobante (idVenta, numero, fechaEmision, nitCliente, razonSocialCliente) VALUES
(1, 'CBE-2026-001', DATE_SUB(NOW(), INTERVAL 6 DAY), '4567890', 'Carlos Mamani Condori'),
(2, 'CBE-2026-002', DATE_SUB(NOW(), INTERVAL 6 DAY), NULL, NULL),
(3, 'CBE-2026-003', DATE_SUB(NOW(), INTERVAL 6 DAY), '5678901', 'Ana Lucía Flores Ríos'),
(4, 'CBE-2026-004', DATE_SUB(NOW(), INTERVAL 6 DAY), NULL, NULL),
(5, 'CBE-2026-005', DATE_SUB(NOW(), INTERVAL 6 DAY), NULL, NULL),
(6, 'CBE-2026-006', DATE_SUB(NOW(), INTERVAL 6 DAY), '4567890', 'Carlos Mamani Condori'),
(7, 'CBE-2026-007', DATE_SUB(NOW(), INTERVAL 6 DAY), NULL, NULL),
(8, 'CBE-2026-008', DATE_SUB(NOW(), INTERVAL 5 DAY), NULL, NULL),
(9, 'CBE-2026-009', DATE_SUB(NOW(), INTERVAL 5 DAY), '4567890', 'Carlos Mamani Condori'),
(10, 'CBE-2026-010', DATE_SUB(NOW(), INTERVAL 5 DAY), NULL, NULL),
(11, 'CBE-2026-011', DATE_SUB(NOW(), INTERVAL 5 DAY), NULL, NULL),
(12, 'CBE-2026-012', DATE_SUB(NOW(), INTERVAL 5 DAY), NULL, NULL),
(13, 'CBE-2026-013', DATE_SUB(NOW(), INTERVAL 5 DAY), NULL, NULL),
(14, 'CBE-2026-014', DATE_SUB(NOW(), INTERVAL 5 DAY), '4567890', 'Carlos Mamani Condori'),
(15, 'CBE-2026-015', DATE_SUB(NOW(), INTERVAL 4 DAY), NULL, NULL),
(16, 'CBE-2026-016', DATE_SUB(NOW(), INTERVAL 4 DAY), NULL, NULL),
(17, 'CBE-2026-017', DATE_SUB(NOW(), INTERVAL 4 DAY), NULL, NULL),
(18, 'CBE-2026-018', DATE_SUB(NOW(), INTERVAL 4 DAY), '4567890', 'Carlos Mamani Condori'),
(19, 'CBE-2026-019', DATE_SUB(NOW(), INTERVAL 4 DAY), NULL, NULL),
(20, 'CBE-2026-020', DATE_SUB(NOW(), INTERVAL 4 DAY), '6789012', 'Luis Quispe Torres'),
(21, 'CBE-2026-021', DATE_SUB(NOW(), INTERVAL 3 DAY), NULL, NULL),
(22, 'CBE-2026-022', DATE_SUB(NOW(), INTERVAL 3 DAY), NULL, NULL),
(23, 'CBE-2026-023', DATE_SUB(NOW(), INTERVAL 3 DAY), '4567890', 'Carlos Mamani Condori'),
(24, 'CBE-2026-024', DATE_SUB(NOW(), INTERVAL 3 DAY), NULL, NULL),
(25, 'CBE-2026-025', DATE_SUB(NOW(), INTERVAL 3 DAY), NULL, NULL),
(26, 'CBE-2026-026', DATE_SUB(NOW(), INTERVAL 3 DAY), '7890124', 'María Fernanda Vargas López'),
(27, 'CBE-2026-027', DATE_SUB(NOW(), INTERVAL 3 DAY), '8901234', 'Pedro Huanca Ramos'),
(28, 'CBE-2026-028', DATE_SUB(NOW(), INTERVAL 2 DAY), '4567890', 'Carlos Mamani Condori'),
(29, 'CBE-2026-029', DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, NULL),
(30, 'CBE-2026-030', DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, NULL),
(31, 'CBE-2026-031', DATE_SUB(NOW(), INTERVAL 2 DAY), '4567890', 'Carlos Mamani Condori'),
(32, 'CBE-2026-032', DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, NULL),
(33, 'CBE-2026-033', DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, NULL),
(34, 'CBE-2026-034', DATE_SUB(NOW(), INTERVAL 2 DAY), '6789012', 'Luis Quispe Torres'),
(35, 'CBE-2026-035', DATE_SUB(NOW(), INTERVAL 2 DAY), NULL, NULL),
(36, 'CBE-2026-036', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL),
(37, 'CBE-2026-037', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL),
(38, 'CBE-2026-038', DATE_SUB(NOW(), INTERVAL 1 DAY), '4567890', 'Carlos Mamani Condori'),
(39, 'CBE-2026-039', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL),
(40, 'CBE-2026-040', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL),
(41, 'CBE-2026-041', DATE_SUB(NOW(), INTERVAL 1 DAY), '7890124', 'María Fernanda Vargas López'),
(42, 'CBE-2026-042', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, NULL),
(43, 'CBE-2026-043', NOW(), NULL, NULL),
(44, 'CBE-2026-044', NOW(), '4567890', 'Carlos Mamani Condori'),
(45, 'CBE-2026-045', NOW(), NULL, NULL),
(46, 'CBE-2026-046', NOW(), NULL, NULL);

-- ============================================================
-- FASE 4: STORED PROCEDURES PARA REPORTES
-- ============================================================

DELIMITER $$

DROP PROCEDURE IF EXISTS sp_reporte_ocupacion$$
CREATE PROCEDURE sp_reporte_ocupacion(
    IN p_fechaInicio DATE,
    IN p_fechaFin DATE,
    IN p_idPelicula INT,
    IN p_idSala VARCHAR(50)
)
BEGIN
    SELECT
        f.fecha,
        f.idSala,
        s.tipo AS salaTipo,
        p.titulo AS pelicula,
        f.horaInicio,
        s.capacidadTotal,
        COUNT(b.idBoleto) AS boletosVendidos,
        (s.capacidadTotal - COUNT(b.idBoleto)) AS asientosDisponibles,
        ROUND(COUNT(b.idBoleto) / s.capacidadTotal * 100, 1) AS ocupacionPorcentaje
    FROM Funcion f
    JOIN Sala s ON f.idSala = s.idSala
    JOIN Pelicula p ON f.idPelicula = p.idPelicula
    LEFT JOIN Venta v ON v.idFuncion = f.idFuncion AND v.estadoA = 1
    LEFT JOIN Boleto b ON b.idVenta = v.idVenta AND b.estadoA = 1
    WHERE f.estadoA = 1
      AND (p_fechaInicio IS NULL OR f.fecha >= p_fechaInicio)
      AND (p_fechaFin IS NULL OR f.fecha <= p_fechaFin)
      AND (p_idPelicula IS NULL OR p.idPelicula = p_idPelicula)
      AND (p_idSala IS NULL OR f.idSala = p_idSala)
    GROUP BY f.idFuncion, f.fecha, f.idSala, s.tipo, p.titulo, f.horaInicio, s.capacidadTotal
    ORDER BY ocupacionPorcentaje DESC, f.fecha DESC, f.horaInicio;
END$$

DROP PROCEDURE IF EXISTS sp_reporte_mas_vistas$$
CREATE PROCEDURE sp_reporte_mas_vistas(
    IN p_fechaInicio DATE,
    IN p_fechaFin DATE,
    IN p_orden VARCHAR(4)
)
BEGIN
    SELECT
        pelicula,
        director,
        SUM(boletosVendidos) AS totalBoletosVendidos,
        ROUND(SUM(ingresoFuncion), 2) AS ingresoTotal,
        ROUND(AVG(ocupacionPorcentaje), 1) AS promedioOcupacion,
        COUNT(*) AS cantidadFunciones,
        DATEDIFF(CURDATE(), MIN(fechaFuncion)) AS semanasEnCartelera
    FROM (
        SELECT
            p.idPelicula,
            p.titulo AS pelicula,
            p.director,
            f.idFuncion,
            f.fecha AS fechaFuncion,
            COUNT(b.idBoleto) AS boletosVendidos,
            IFNULL(SUM(b.precioPagado), 0) AS ingresoFuncion,
            ROUND(COUNT(b.idBoleto) / s.capacidadTotal * 100, 1) AS ocupacionPorcentaje
        FROM Funcion f
        JOIN Pelicula p ON f.idPelicula = p.idPelicula
        JOIN Sala s ON f.idSala = s.idSala
        LEFT JOIN Venta v ON v.idFuncion = f.idFuncion AND v.estadoA = 1
        LEFT JOIN Boleto b ON b.idVenta = v.idVenta AND b.estadoA = 1
        WHERE f.estadoA = 1
          AND (p_fechaInicio IS NULL OR f.fecha >= p_fechaInicio)
          AND (p_fechaFin IS NULL OR f.fecha <= p_fechaFin)
        GROUP BY f.idFuncion, p.idPelicula, p.titulo, p.director, f.fecha, s.capacidadTotal
    ) AS sub
    GROUP BY idPelicula, pelicula, director
    ORDER BY IF(p_orden = 'ASC', totalBoletosVendidos, NULL) ASC,
             IF(p_orden = 'ASC', NULL, totalBoletosVendidos) DESC
    LIMIT 10;
END$$

DROP PROCEDURE IF EXISTS sp_reporte_ventas$$
CREATE PROCEDURE sp_reporte_ventas(
    IN p_fechaInicio DATE,
    IN p_fechaFin DATE
)
BEGIN
    SELECT
        v.idVenta,
        v.fechaCompra,
        CONCAT(u.nombre1, ' ', IFNULL(u.apellidoP, '')) AS cliente,
        pel.titulo AS pelicula,
        f.fecha AS fechaFuncion,
        f.horaInicio,
        s.tipo AS sala,
        COUNT(b.idBoleto) AS cantidadEntradas,
        v.montoTotal,
        v.metodoPago,
        v.tipo AS canal,
        v.estadoVenta
    FROM Venta v
    JOIN Funcion f ON v.idFuncion = f.idFuncion
    JOIN Pelicula pel ON f.idPelicula = pel.idPelicula
    JOIN Sala s ON f.idSala = s.idSala
    LEFT JOIN Boleto b ON v.idVenta = b.idVenta
    LEFT JOIN Usuario u ON v.idCliente = u.idUsuario
    WHERE v.estadoA = 1
      AND (p_fechaInicio IS NULL OR DATE(v.fechaCompra) >= p_fechaInicio)
      AND (p_fechaFin IS NULL OR DATE(v.fechaCompra) <= p_fechaFin)
    GROUP BY v.idVenta, v.fechaCompra, u.nombre1, u.apellidoP,
      pel.titulo, f.fecha, f.horaInicio, s.tipo,
      v.montoTotal, v.metodoPago, v.tipo, v.estadoVenta
    ORDER BY v.fechaCompra DESC;
END$$

DROP PROCEDURE IF EXISTS sp_historial_cliente$$
CREATE PROCEDURE sp_historial_cliente(
    IN p_idCliente INT
)
BEGIN
    SELECT
        v.idVenta,
        c.numero,
        p.titulo AS peliculaTitulo,
        v.fechaCompra,
        f.fecha,
        f.horaInicio,
        f.idSala,
        s.tipo AS salaTipo,
        GROUP_CONCAT(CONCAT(a.fila, a.columna) ORDER BY a.fila, a.columna SEPARATOR ', ') AS asientos,
        v.montoTotal,
        v.estadoVenta
    FROM Comprobante c
    JOIN Venta v ON c.idVenta = v.idVenta
    JOIN Boleto b ON v.idVenta = b.idVenta
    JOIN Funcion f ON v.idFuncion = f.idFuncion
    JOIN Pelicula p ON f.idPelicula = p.idPelicula
    JOIN Sala s ON f.idSala = s.idSala
    JOIN Asiento a ON b.idAsiento = a.idAsiento
    WHERE v.idCliente = p_idCliente
      AND v.estadoA = 1
      AND v.estadoVenta IN ('COMPLETADA', 'CANCELADA')
    GROUP BY c.idComprobante, c.numero, p.titulo, v.fechaCompra, f.fecha, f.horaInicio, f.idSala, s.tipo, v.montoTotal, v.estadoVenta, v.idVenta
    ORDER BY v.fechaCompra DESC, f.horaInicio DESC;
END$$

DELIMITER ;

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
