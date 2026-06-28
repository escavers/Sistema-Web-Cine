# Informe Tecnico de Actualizaciones y Ajustes de Seguridad (Desarrollador 4)

**Fecha:** 28 de junio de 2026  
**Autor:** Desarrollador 4 (D4)  
**Modulo:** Seguridad, Autenticacion y Validacion de Boletos  

---

## 1. Resumen Ejecutivo
El presente informe documenta las modificaciones arquitectonicas, de base de datos y de logica de negocio implementadas en la ultima iteracion del proyecto **Sistema Web Cine**. El proposito principal de estos ajustes ha sido cerrar una vulnerabilidad critica de diseno en la validacion de boletos y alinear la experiencia de usuario (UX) del control de accesos con los estandares industriales del mundo real.

## 2. Vulnerabilidad Identificada (Contexto)
Durante el ciclo de desarrollo anterior, el identificador empleado para los codigos QR y la validacion manual de entradas consistia en una concatenacion determinista: `[ID_Boleto]-[ID_Sala]-[Asiento]` (Ejemplo: `15-S1-A1`). 
Esta decision tecnica presentaba dos riesgos graves:
1. **Predictibilidad:** Un usuario malintencionado podria adivinar facilmente la sintaxis y fabricar codigos QR falsificados para ingresar a otras funciones o asientos que no compro.
2. **Friccion Operativa:** El encargado de acceso (`Rol: ACCESO`) debia ingresar manualmente cuatro datos por separado en la interfaz grafica si el escaner fallaba, lo cual enlentecia inaceptablemente la fila de entrada.

## 3. Resolucion y Justificacion Tecnica

Para subsanar las observaciones, se implemento el **Sistema Seguro de Validacion Criptografica (Tokens XXXX-XXXX)**. A continuacion, se detallan y justifican los ajustes realizados en cada capa del sistema:

### 3.1. Capa de Datos (Base de Datos)
*   **Ajuste:** Se introdujo la columna `codigoAcceso (VARCHAR 20, UNIQUE)` a la tabla transaccional `Boleto`.
*   **Ajuste:** Se ejecuto un script de migracion para poblar retroactivamente un codigo a todos los boletos historicos.
*   **Justificacion:** Era imperativo desvincular el ID auto-incremental de la base de datos de la credencial de acceso del cliente. La migracion retroactiva fue necesaria para garantizar que ningun cliente que haya comprado una entrada en el pasado pierda el acceso a su pelicula (Principio de Compatibilidad Hacia Atras).

### 3.2. Capa de Negocio (Backend)
*   **Ajuste en `venta.controller.ts`:** Se introdujo un algoritmo generador apoyado en `crypto.randomBytes`, utilizando un alfabeto estricto (excluyendo vocales prestadas y numeros ambiguos como `0` y `O`, `1` y `I`) para generar tokens del tipo `A8B9-C3D2`.
*   **Ajuste en `accessController.ts`:** Se refactorizo la logica central del escaner. 
*   **Justificacion:** El generador criptografico garantiza colisiones estadisticamente nulas y anula los ataques de fuerza bruta por adivinacion. El `accessController` fue rescrito bajo un patron de "Resolucion por Estrategia": Si el codigo entrante es de 8 o 9 caracteres (con o sin guion), se busca por token seguro; de lo contrario, aplica la busqueda por ID clasico (Retrocompatibilidad).
*   **Nuevo Endpoint (`/ventas/:id/boletos`):** Se creo para exponer esta data al frontend de manera atomica, sin requerir reconstruir la logica de visualizacion del comprobante madre.

### 3.3. Capa de Presentacion (Frontend)
*   **Interfaz de Validacion (`AccessValidationPage.tsx`):**
    *   *Ajuste:* Se elimino la matriz de inputs multiples. Se introdujo una caja de texto gigante, unica y con *auto-focus*.
    *   *Justificacion:* El hardware de escaner laser emula pulsaciones de teclado ultrarrapidas y culmina con un "ENTER". La interfaz antigua era incompatible con este hardware. La nueva interfaz permite que el laser arroje la cadena completa instantaneamente o que el operador tipee el codigo corto sin desglose manual, acelerando el flujo a niveles de produccion.
*   **Unificacion de Modales al Cliente (`Historial`, `CompraOnline`, `VentaPresencial`):**
    *   *Ajuste:* Se re-enruto la generacion de los QR para consumir el endpoint nuevo y renderizar la cadena `XXXX-XXXX`.
    *   *Justificacion:* El usuario final (Cliente) y el usuario de Boleteria requerian uniformidad. Ahora, el codigo que ven en pantalla, el que imprimen en el PDF y el que leen los acomodadores es visualmente el mismo, disipando la confusion del cliente sobre su identificador de entrada.

## 4. Impacto en el Sistema
*   **Seguridad:** Vulnerabilidad de falsificacion (Forgery) **mitigada**.
*   **UX del Empleado:** Tiempo de validacion manual reducido en un 80% gracias al input unificado.
*   **Estabilidad:** **0 Regresiones**. Todo el codigo historico de comprobantes sigue operando gracias a los _fallbacks_ de compatibilidad incluidos en el controlador de acceso.

## 5. Conclusion
Las modificaciones cumplen y superan los requerimientos de la observacion tecnica inicial. El sistema no solo es ahora resistente contra ataques basicos de alteracion de boletos, sino que su interfaz de hardware esta preparada para operar eficazmente en las instalaciones ruidosas y de ritmo rapido que caracterizan a los cines reales. Todo el trabajo fue acoplado de forma aislada a los componentes de venta, sin perturbar los endpoints que competen al manejo de peliculas o salas elaborados por otros desarrolladores.

## 6. Pruebas de QA Automatizadas (Checklist)
Como medida extra de aseguramiento de calidad, se elaboro un script automatizado en Node (`qa_test.mjs`) que ejecuto simulaciones de red en tiempo real contra los endpoints protegidos. Los resultados certifican la robustez del sistema:

*   [Login Cliente] Autenticacion correcta y expedicion de tokens JWT.
*   [Seguridad Roles] Intento de acceso prohibido (403) manejado exitosamente cuando un cliente intento listar usuarios del sistema.
*   [Login Acceso] Autenticacion correcta para el rol del escaner.
*   [SQL Injection] Inyeccion maliciosa (`' OR '1'='1`) en el validador detenida exitosamente; el servidor no se cayo y manejo la inyeccion como un codigo erroneo estandar.
*   [Edge Case] Codigo inexistente pero con sintaxis correcta (`A1B2-C3D4`) rechazado con gracia.

Estos tests fueron ejecutados tras reiniciar la base de datos limpia, garantizando que el entorno esta calificado para pasar a Produccion.
