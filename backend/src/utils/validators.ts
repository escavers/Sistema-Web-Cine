export function validarNombre(nombre: string): boolean {
    return /^[A-Za-zÁÉÍÓÚáéíóúÑñ ]+$/.test(nombre.trim());
}

export function validarCI(ci: string): boolean {
    // Permite números, guiones y letras (para complemento como LP, SC, -1A, etc.)
    // Ejemplos válidos: 1234567, 1234567LP, 1234567-1A, 9876543SC
    return /^[0-9]+[A-Za-z0-9\-]*$/.test(ci.trim()) && /[0-9]/.test(ci);
}

export function validarTelefono(telefono: string): boolean {
    // Valida que sean exactamente 8 dígitos, comience con 6 o 7, y no sean todos iguales
    const telefonoLimpio = telefono.trim();
    if (!/^[67][0-9]{7}$/.test(telefonoLimpio)) {
        return false;
    }
    // Verificar que no sean todos iguales (ej: 11111111, 22222222)
    if (/^(\d)\1{7}$/.test(telefonoLimpio)) {
        return false;
    }
    return true;
}

export function validarCorreo(correo: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo);
}

export function validarFechaNacimiento(fecha: string): boolean {
    const nacimiento = new Date(fecha);
    const hoy = new Date();

    // Verificar que la fecha sea válida
    if (isNaN(nacimiento.getTime())) {
        return false;
    }

    // No permitir fechas futuras
    if (nacimiento >= hoy) {
        return false;
    }

    // Calcular edad
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mes = hoy.getMonth() - nacimiento.getMonth();
    if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
        edad--;
    }

    // Edad entre 1 y 120 años
    if (edad < 1) {
        return false;
    }

    if (edad > 120) {
        return false;
    }

    return true;
}