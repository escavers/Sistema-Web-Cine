CREATE DATABASE IF NOT EXISTS cine_db;
USE cine_db;

-- 1. TABLA ROL
CREATE TABLE Rol (
    idRol VARCHAR(50) PRIMARY KEY,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT,
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT
);

-- 2. TABLA BASE USUARIO
CREATE TABLE Usuario (
    idUsuario INT AUTO_INCREMENT PRIMARY KEY,
    nombre1 VARCHAR(50) NOT NULL,
    nombre2 VARCHAR(50),
    apellidoP VARCHAR(50) NOT NULL,
    apellidoM VARCHAR(50),
    correo VARCHAR(100) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    fechaNacimiento DATE,
    contrasena VARCHAR(255) NOT NULL,
    idRol VARCHAR(50) NOT NULL,
    estado BOOLEAN DEFAULT TRUE,
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT,
    FOREIGN KEY (idRol) REFERENCES Rol(idRol)
);

-- 3. TABLAS HIJAS DE USUARIO (HERENCIA)
CREATE TABLE Cliente (
    idUsuario INT PRIMARY KEY,
    nit VARCHAR(20),
    razonSocial VARCHAR(100),
    FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario) ON DELETE CASCADE
);

CREATE TABLE EncargadoBoleteria (
    idUsuario INT PRIMARY KEY,
    FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario) ON DELETE CASCADE
);

CREATE TABLE Administrador (
    idUsuario INT PRIMARY KEY,
    FOREIGN KEY (idUsuario) REFERENCES Usuario(idUsuario) ON DELETE CASCADE
);

-- 4. TABLA PROMOCION
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

-- 5. TABLA VENTA
CREATE TABLE Venta (
    idVenta INT AUTO_INCREMENT PRIMARY KEY,
    idCliente INT,
    idEncargado INT,
    idPromocion VARCHAR(50),
    fechaCompra DATETIME NOT NULL,
    tipo VARCHAR(50),
    montoTotal DECIMAL(10, 2) NOT NULL,
    estado VARCHAR(50),
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT,
    FOREIGN KEY (idCliente) REFERENCES Cliente(idUsuario),
    FOREIGN KEY (idEncargado) REFERENCES EncargadoBoleteria(idUsuario),
    FOREIGN KEY (idPromocion) REFERENCES Promocion(idPromocion)
);

-- 6. TABLA PAGO
CREATE TABLE Pago (
    idPago INT AUTO_INCREMENT PRIMARY KEY,
    idVenta INT UNIQUE NOT NULL,
    fechaPago DATETIME NOT NULL,
    montoTotal DECIMAL(10, 2) NOT NULL,
    metodoPago VARCHAR(50),
    estado VARCHAR(50),
    codigoTransaccion VARCHAR(100),
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT,
    FOREIGN KEY (idVenta) REFERENCES Venta(idVenta) ON DELETE CASCADE
);

-- 7. TABLA COMPROBANTE
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

-- 8. TABLA CANCELACION
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

-- 9. TABLA REPORTE
CREATE TABLE Reporte (
    idReporte INT AUTO_INCREMENT PRIMARY KEY,
    idAdministrador INT NOT NULL,
    tipo VARCHAR(100),
    fechaGeneracion DATETIME NOT NULL,
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT,
    FOREIGN KEY (idAdministrador) REFERENCES Administrador(idUsuario)
);

-- 10. TABLA PELICULA
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

-- 11. TABLA SALA
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

-- 12. TABLA ASIENTO
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

-- 13. TABLA FUNCION
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

-- 14. TABLA BOLETO
CREATE TABLE Boleto (
    idBoleto INT AUTO_INCREMENT PRIMARY KEY,
    idFuncion INT NOT NULL,
    idAsiento VARCHAR(50) NOT NULL,
    idVenta INT NOT NULL,
    precioPagado DECIMAL(10, 2) NOT NULL,
    estadoA BOOLEAN DEFAULT TRUE,
    fechaA DATE,
    usuarioA INT,
    FOREIGN KEY (idFuncion) REFERENCES Funcion(idFuncion),
    FOREIGN KEY (idAsiento) REFERENCES Asiento(idAsiento),
    FOREIGN KEY (idVenta) REFERENCES Venta(idVenta) ON DELETE CASCADE
);

-- 15. TABLA DE AUDITORÍA
CREATE TABLE Auditoria (
    IdAuditoria INT AUTO_INCREMENT PRIMARY KEY,
    TablaNombre VARCHAR(50) NOT NULL,
    RegistroId VARCHAR(50) NOT NULL,
    Accion VARCHAR(50) NOT NULL,
    ValorAnterior LONGTEXT NULL,
    ValorNuevo LONGTEXT NULL,
    UsuarioA INT NULL,
    FechaA DATETIME DEFAULT CURRENT_TIMESTAMP,
    DireccionIP VARCHAR(50) NULL,
    FOREIGN KEY (UsuarioA) REFERENCES Usuario(idUsuario) ON DELETE SET NULL
);

DELIMITER $$

-- DISPARADORES PARA 1. ROL
CREATE TRIGGER tr_Rol_Alta
AFTER INSERT ON Rol
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Rol', 
        NEW.idRol, 
        'INSERT', 
        NULL, 
        CONCAT(NEW.idRol, '|', NEW.nombre, '|', IFNULL(NEW.descripcion, ''), '|', NEW.estadoA, '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Rol_Modificacion
AFTER UPDATE ON Rol
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Rol', 
        NEW.idRol, 
        'UPDATE', 
        CONCAT(OLD.idRol, '|', OLD.nombre, '|', IFNULL(OLD.descripcion, ''), '|', OLD.estadoA, '|'), 
        CONCAT(NEW.idRol, '|', NEW.nombre, '|', IFNULL(NEW.descripcion, ''), '|', NEW.estadoA, '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Rol_Baja
AFTER DELETE ON Rol
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Rol', 
        OLD.idRol, 
        'DELETE', 
        CONCAT(OLD.idRol, '|', OLD.nombre, '|', IFNULL(OLD.descripcion, ''), '|', OLD.estadoA, '|'), 
        NULL, 
        OLD.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

-- DISPARADORES PARA 2. USUARIO
CREATE TRIGGER tr_Usuario_Alta
AFTER INSERT ON Usuario
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Usuario', 
        NEW.idUsuario, 
        'INSERT', 
        NULL, 
        CONCAT(NEW.idUsuario, '|', NEW.nombre1, '|', IFNULL(NEW.nombre2, ''), '|', NEW.apellidoP, '|', IFNULL(NEW.apellidoM, ''), '|', NEW.correo, '|', IFNULL(NEW.telefono, ''), '|', IFNULL(NEW.fechaNacimiento, ''), '|', NEW.idRol, '|', NEW.estado, '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Usuario_Modificacion
AFTER UPDATE ON Usuario
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Usuario', 
        NEW.idUsuario, 
        'UPDATE', 
        CONCAT(OLD.idUsuario, '|', OLD.nombre1, '|', IFNULL(OLD.nombre2, ''), '|', OLD.apellidoP, '|', IFNULL(OLD.apellidoM, ''), '|', OLD.correo, '|', IFNULL(OLD.telefono, ''), '|', IFNULL(OLD.fechaNacimiento, ''), '|', OLD.idRol, '|', OLD.estado, '|'), 
        CONCAT(NEW.idUsuario, '|', NEW.nombre1, '|', IFNULL(NEW.nombre2, ''), '|', NEW.apellidoP, '|', IFNULL(NEW.apellidoM, ''), '|', NEW.correo, '|', IFNULL(NEW.telefono, ''), '|', IFNULL(NEW.fechaNacimiento, ''), '|', NEW.idRol, '|', NEW.estado, '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Usuario_Baja
AFTER DELETE ON Usuario
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Usuario', 
        OLD.idUsuario, 
        'DELETE', 
        CONCAT(OLD.idUsuario, '|', OLD.nombre1, '|', IFNULL(OLD.nombre2, ''), '|', OLD.apellidoP, '|', IFNULL(OLD.apellidoM, ''), '|', OLD.correo, '|', IFNULL(OLD.telefono, ''), '|', IFNULL(OLD.fechaNacimiento, ''), '|', OLD.idRol, '|', OLD.estado, '|'), 
        NULL, 
        OLD.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

-- DISPARADORES PARA 3. CLIENTE
CREATE TRIGGER tr_Cliente_Alta
AFTER INSERT ON Cliente
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Cliente', 
        NEW.idUsuario, 
        'INSERT', 
        NULL, 
        CONCAT(NEW.idUsuario, '|', IFNULL(NEW.nit, ''), '|', IFNULL(NEW.razonSocial, ''), '|'), 
        NULL, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Cliente_Modificacion
AFTER UPDATE ON Cliente
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Cliente', 
        NEW.idUsuario, 
        'UPDATE', 
        CONCAT(OLD.idUsuario, '|', IFNULL(OLD.nit, ''), '|', IFNULL(OLD.razonSocial, ''), '|'), 
        CONCAT(NEW.idUsuario, '|', IFNULL(NEW.nit, ''), '|', IFNULL(NEW.razonSocial, ''), '|'), 
        NULL, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Cliente_Baja
AFTER DELETE ON Cliente
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Cliente', 
        OLD.idUsuario, 
        'DELETE', 
        CONCAT(OLD.idUsuario, '|', IFNULL(OLD.nit, ''), '|', IFNULL(OLD.razonSocial, ''), '|'), 
        NULL, 
        NULL, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

-- DISPARADORES PARA 3. ENCARGADO BOLETERIA
CREATE TRIGGER tr_EncargadoBoleteria_Alta
AFTER INSERT ON EncargadoBoleteria
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('EncargadoBoleteria', NEW.idUsuario, 'INSERT', NULL, CONCAT(NEW.idUsuario, '|'), NULL, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_EncargadoBoleteria_Baja
AFTER DELETE ON EncargadoBoleteria
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('EncargadoBoleteria', OLD.idUsuario, 'DELETE', CONCAT(OLD.idUsuario, '|'), NULL, NULL, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

-- DISPARADORES PARA 3. ADMINISTRADOR
CREATE TRIGGER tr_Administrador_Alta
AFTER INSERT ON Administrador
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Administrador', NEW.idUsuario, 'INSERT', NULL, CONCAT(NEW.idUsuario, '|'), NULL, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

CREATE TRIGGER tr_Administrador_Baja
AFTER DELETE ON Administrador
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES ('Administrador', OLD.idUsuario, 'DELETE', CONCAT(OLD.idUsuario, '|'), NULL, NULL, NOW(), SUBSTRING_INDEX(USER(), '@', -1));
END$$

-- DISPARADORES PARA 4. PROMOCION
CREATE TRIGGER tr_Promocion_Alta
AFTER INSERT ON Promocion
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Promocion', 
        NEW.idPromocion, 
        'INSERT', 
        NULL, 
        CONCAT(NEW.idPromocion, '|', NEW.nombre, '|', IFNULL(NEW.descripcion, ''), '|', IFNULL(NEW.fechaInicio, ''), '|', IFNULL(NEW.fechaFin, ''), '|', IFNULL(NEW.tipo, ''), '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Promocion_Modificacion
AFTER UPDATE ON Promocion
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Promocion', 
        NEW.idPromocion, 
        'UPDATE', 
        CONCAT(OLD.idPromocion, '|', OLD.nombre, '|', IFNULL(OLD.descripcion, ''), '|', IFNULL(OLD.fechaInicio, ''), '|', IFNULL(OLD.fechaFin, ''), '|', IFNULL(OLD.tipo, ''), '|'), 
        CONCAT(NEW.idPromocion, '|', NEW.nombre, '|', IFNULL(NEW.descripcion, ''), '|', IFNULL(NEW.fechaInicio, ''), '|', IFNULL(NEW.fechaFin, ''), '|', IFNULL(NEW.tipo, ''), '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Promocion_Baja
AFTER DELETE ON Promocion
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Promocion', 
        OLD.idPromocion, 
        'DELETE', 
        CONCAT(OLD.idPromocion, '|', OLD.nombre, '|', IFNULL(OLD.descripcion, ''), '|', IFNULL(OLD.fechaInicio, ''), '|', IFNULL(OLD.fechaFin, ''), '|', IFNULL(OLD.tipo, ''), '|'), 
        NULL, 
        OLD.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

-- DISPARADORES PARA 5. VENTA
CREATE TRIGGER tr_Venta_Alta
AFTER INSERT ON Venta
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Venta', 
        NEW.idVenta, 
        'INSERT', 
        NULL, 
        CONCAT(NEW.idVenta, '|', IFNULL(NEW.idCliente, ''), '|', IFNULL(NEW.idEncargado, ''), '|', IFNULL(NEW.idPromocion, ''), '|', NEW.fechaCompra, '|', NEW.tipo, '|', NEW.montoTotal, '|', NEW.estado, '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Venta_Modificacion
AFTER UPDATE ON Venta
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Venta', 
        NEW.idVenta, 
        'UPDATE', 
        CONCAT(OLD.idVenta, '|', IFNULL(OLD.idCliente, ''), '|', IFNULL(OLD.idEncargado, ''), '|', IFNULL(OLD.idPromocion, ''), '|', OLD.fechaCompra, '|', OLD.tipo, '|', OLD.montoTotal, '|', OLD.estado, '|'), 
        CONCAT(NEW.idVenta, '|', IFNULL(NEW.idCliente, ''), '|', IFNULL(NEW.idEncargado, ''), '|', IFNULL(NEW.idPromocion, ''), '|', NEW.fechaCompra, '|', NEW.tipo, '|', NEW.montoTotal, '|', NEW.estado, '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Venta_Baja
AFTER DELETE ON Venta
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Venta', 
        OLD.idVenta, 
        'DELETE', 
        CONCAT(OLD.idVenta, '|', IFNULL(OLD.idCliente, ''), '|', IFNULL(OLD.idEncargado, ''), '|', IFNULL(OLD.idPromocion, ''), '|', OLD.fechaCompra, '|', OLD.tipo, '|', OLD.montoTotal, '|', OLD.estado, '|'), 
        NULL, 
        OLD.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

-- DISPARADORES PARA 6. PAGO
CREATE TRIGGER tr_Pago_Alta
AFTER INSERT ON Pago
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Pago', 
        NEW.idPago, 
        'INSERT', 
        NULL, 
        CONCAT(NEW.idPago, '|', NEW.idVenta, '|', NEW.fechaPago, '|', NEW.montoTotal, '|', NEW.metodoPago, '|', NEW.estado, '|', IFNULL(NEW.codigoTransaccion, ''), '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Pago_Modificacion
AFTER UPDATE ON Pago
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Pago', 
        NEW.idPago, 
        'UPDATE', 
        CONCAT(OLD.idPago, '|', OLD.idVenta, '|', OLD.fechaPago, '|', OLD.montoTotal, '|', OLD.metodoPago, '|', OLD.estado, '|', IFNULL(OLD.codigoTransaccion, ''), '|'), 
        CONCAT(NEW.idPago, '|', NEW.idVenta, '|', NEW.fechaPago, '|', NEW.montoTotal, '|', NEW.metodoPago, '|', NEW.estado, '|', IFNULL(NEW.codigoTransaccion, ''), '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Pago_Baja
AFTER DELETE ON Pago
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Pago', 
        OLD.idPago, 
        'DELETE', 
        CONCAT(OLD.idPago, '|', OLD.idVenta, '|', OLD.fechaPago, '|', OLD.montoTotal, '|', OLD.metodoPago, '|', OLD.estado, '|', IFNULL(OLD.codigoTransaccion, ''), '|'), 
        NULL, 
        OLD.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

-- DISPARADORES PARA 7. COMPROBANTE
CREATE TRIGGER tr_Comprobante_Alta
AFTER INSERT ON Comprobante
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Comprobante', 
        NEW.idComprobante, 
        'INSERT', 
        NULL, 
        CONCAT(NEW.idComprobante, '|', NEW.idVenta, '|', NEW.numero, '|', NEW.fechaEmision, '|', IFNULL(NEW.nitCliente, ''), '|', IFNULL(NEW.razonSocialCliente, ''), '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Comprobante_Baja
AFTER DELETE ON Comprobante
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Comprobante', 
        OLD.idComprobante, 
        'DELETE', 
        CONCAT(OLD.idComprobante, '|', OLD.idVenta, '|', OLD.numero, '|', OLD.fechaEmision, '|', IFNULL(OLD.nitCliente, ''), '|', IFNULL(OLD.razonSocialCliente, ''), '|'), 
        NULL, 
        OLD.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

-- DISPARADORES PARA 8. CANCELACION
CREATE TRIGGER tr_Cancelacion_Alta
AFTER INSERT ON Cancelacion
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Cancelacion', 
        NEW.idCancelacion, 
        'INSERT', 
        NULL, 
        CONCAT(NEW.idCancelacion, '|', NEW.idVenta, '|', NEW.fechaHora, '|', IFNULL(NEW.estado, ''), '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Cancelacion_Baja
AFTER DELETE ON Cancelacion
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Cancelacion', 
        OLD.idCancelacion, 
        'DELETE', 
        CONCAT(OLD.idCancelacion, '|', OLD.idVenta, '|', OLD.fechaHora, '|', IFNULL(OLD.estado, ''), '|'), 
        NULL, 
        OLD.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

-- DISPARADORES PARA 9. REPORTE
CREATE TRIGGER tr_Reporte_Alta
AFTER INSERT ON Reporte
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Reporte', 
        NEW.idReporte, 
        'INSERT', 
        NULL, 
        CONCAT(NEW.idReporte, '|', NEW.idAdministrador, '|', IFNULL(NEW.tipo, ''), '|', NEW.fechaGeneracion, '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Reporte_Baja
AFTER DELETE ON Reporte
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Reporte', 
        OLD.idReporte, 
        'DELETE', 
        CONCAT(OLD.idReporte, '|', OLD.idAdministrador, '|', IFNULL(OLD.tipo, ''), '|', OLD.fechaGeneracion, '|'), 
        NULL, 
        OLD.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

-- DISPARADORES PARA 10. PELICULA
CREATE TRIGGER tr_Pelicula_Alta
AFTER INSERT ON Pelicula
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Pelicula', 
        NEW.idPelicula, 
        'INSERT', 
        NULL, 
        CONCAT(NEW.idPelicula, '|', NEW.titulo, '|', IFNULL(NEW.director, ''), '|', IFNULL(NEW.clasificacionEdad, ''), '|', IFNULL(NEW.duracionMinutos, ''), '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Pelicula_Modificacion
AFTER UPDATE ON Pelicula
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Pelicula', 
        NEW.idPelicula, 
        'UPDATE', 
        CONCAT(OLD.idPelicula, '|', OLD.titulo, '|', IFNULL(OLD.director, ''), '|', IFNULL(OLD.clasificacionEdad, ''), '|', IFNULL(OLD.duracionMinutos, ''), '|'), 
        CONCAT(NEW.idPelicula, '|', NEW.titulo, '|', IFNULL(NEW.director, ''), '|', IFNULL(NEW.clasificacionEdad, ''), '|', IFNULL(NEW.duracionMinutos, ''), '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Pelicula_Baja
AFTER DELETE ON Pelicula
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Pelicula', 
        OLD.idPelicula, 
        'DELETE', 
        CONCAT(OLD.idPelicula, '|', OLD.titulo, '|', IFNULL(OLD.director, ''), '|', IFNULL(OLD.clasificacionEdad, ''), '|', IFNULL(OLD.duracionMinutos, ''), '|'), 
        NULL, 
        OLD.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

-- DISPARADORES PARA 11. SALA
CREATE TRIGGER tr_Sala_Alta
AFTER INSERT ON Sala
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Sala', 
        NEW.idSala, 
        'INSERT', 
        NULL, 
        CONCAT(NEW.idSala, '|', IFNULL(NEW.tipo, ''), '|', NEW.capacidadTotal, '|', NEW.filas, '|', NEW.columnas, '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Sala_Modificacion
AFTER UPDATE ON Sala
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Sala', 
        NEW.idSala, 
        'UPDATE', 
        CONCAT(OLD.idSala, '|', IFNULL(OLD.tipo, ''), '|', OLD.capacidadTotal, '|', OLD.filas, '|', OLD.columnas, '|'), 
        CONCAT(NEW.idSala, '|', IFNULL(NEW.tipo, ''), '|', NEW.capacidadTotal, '|', NEW.filas, '|', NEW.columnas, '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Sala_Baja
AFTER DELETE ON Sala
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Sala', 
        OLD.idSala, 
        'DELETE', 
        CONCAT(OLD.idSala, '|', IFNULL(OLD.tipo, ''), '|', OLD.capacidadTotal, '|', OLD.filas, '|', OLD.columnas, '|'), 
        NULL, 
        OLD.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

-- DISPARADORES PARA 12. ASIENTO
CREATE TRIGGER tr_Asiento_Alta
AFTER INSERT ON Asiento
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Asiento', 
        NEW.idAsiento, 
        'INSERT', 
        NULL, 
        CONCAT(NEW.idAsiento, '|', NEW.idSala, '|', NEW.fila, '|', NEW.columna, '|', NEW.estado, '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Asiento_Modificacion
AFTER UPDATE ON Asiento
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Asiento', 
        NEW.idAsiento, 
        'UPDATE', 
        CONCAT(OLD.idAsiento, '|', OLD.idSala, '|', OLD.fila, '|', OLD.columna, '|', OLD.estado, '|'), 
        CONCAT(NEW.idAsiento, '|', NEW.idSala, '|', NEW.fila, '|', NEW.columna, '|', NEW.estado, '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Asiento_Baja
AFTER DELETE ON Asiento
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Asiento', 
        OLD.idAsiento, 
        'DELETE', 
        CONCAT(OLD.idAsiento, '|', OLD.idSala, '|', OLD.fila, '|', OLD.columna, '|', OLD.estado, '|'), 
        NULL, 
        OLD.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

-- DISPARADORES PARA 13. FUNCION
CREATE TRIGGER tr_Funcion_Alta
AFTER INSERT ON Funcion
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Funcion', 
        NEW.idFuncion, 
        'INSERT', 
        NULL, 
        CONCAT(NEW.idFuncion, '|', NEW.idSala, '|', NEW.idPelicula, '|', NEW.fecha, '|', NEW.horaInicio, '|', NEW.precioBase, '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Funcion_Modificacion
AFTER UPDATE ON Funcion
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Funcion', 
        NEW.idFuncion, 
        'UPDATE', 
        CONCAT(OLD.idFuncion, '|', OLD.idSala, '|', OLD.idPelicula, '|', OLD.fecha, '|', OLD.horaInicio, '|', OLD.precioBase, '|'), 
        CONCAT(NEW.idFuncion, '|', NEW.idSala, '|', NEW.idPelicula, '|', NEW.fecha, '|', NEW.horaInicio, '|', NEW.precioBase, '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Funcion_Baja
AFTER DELETE ON Funcion
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Funcion', 
        OLD.idFuncion, 
        'DELETE', 
        CONCAT(OLD.idFuncion, '|', OLD.idSala, '|', OLD.idPelicula, '|', OLD.fecha, '|', OLD.horaInicio, '|', OLD.precioBase, '|'), 
        NULL, 
        OLD.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

-- DISPARADORES PARA 14. BOLETO
CREATE TRIGGER tr_Boleto_Alta
AFTER INSERT ON Boleto
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Boleto', 
        NEW.idBoleto, 
        'INSERT', 
        NULL, 
        CONCAT(NEW.idBoleto, '|', NEW.idFuncion, '|', NEW.idAsiento, '|', NEW.idVenta, '|', NEW.precioPagado, '|'), 
        NEW.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

CREATE TRIGGER tr_Boleto_Baja
AFTER DELETE ON Boleto
FOR EACH ROW
BEGIN
    INSERT INTO Auditoria (TablaNombre, RegistroId, Accion, ValorAnterior, ValorNuevo, UsuarioA, FechaA, DireccionIP)
    VALUES (
        'Boleto', 
        OLD.idBoleto, 
        'DELETE', 
        CONCAT(OLD.idBoleto, '|', OLD.idFuncion, '|', OLD.idAsiento, '|', OLD.idVenta, '|', OLD.precioPagado, '|'), 
        NULL, 
        OLD.usuarioA, 
        NOW(),
        SUBSTRING_INDEX(USER(), '@', -1)
    );
END$$

DELIMITER ;