/**
 * Cliente JavaScript para TIC2 API
 * Usar en Frontend (React/Vue/etc)
 * 
 * En un proyecto React, guardar este contenido en: src/api/tic2Api.js
 */

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// ========================
// DETECCIÓN (Detection)
// ========================

/**
 * Sube una imagen y detecta plazas
 * @param {File} imageFile - Archivo de imagen
 * @returns {Promise<Object>} - Resultado de detección
 */
export async function uploadAndDetect(imageFile) {
  try {
    const formData = new FormData();
    formData.append('file', imageFile);
    
    const response = await fetch(
      `${API_BASE_URL}/api/detect/upload-and-detect`,
      {
        method: 'POST',
        body: formData,
      }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading image:', error);
    throw error;
  }
}

/**
 * Obtiene historial de detecciones
 * @param {number} limit - Número máximo de resultados
 * @returns {Promise<Object>} - Lista de detecciones
 */
export async function getDetectionHistory(limit = 100) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/detect/history?limit=${limit}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching detection history:', error);
    throw error;
  }
}

/**
 * Obtiene detalles de una detección específica
 * @param {number} detectionId - ID de la detección
 * @returns {Promise<Object>} - Detalles de la detección
 */
export async function getDetectionDetails(detectionId) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/detect/${detectionId}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching detection details:', error);
    throw error;
  }
}

// ========================
// ROIs (Regiones de Interés)
// ========================

/**
 * Crea una nueva ROI (plaza de estacionamiento)
 * @param {Object} roiData - { name, description, coordinates }
 * @returns {Promise<Object>} - ROI creada
 */
export async function createROI(roiData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rois/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(roiData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating ROI:', error);
    throw error;
  }
}

/**
 * Obtiene lista de todas las ROIs
 * @returns {Promise<Array>} - Lista de ROIs
 */
export async function getROIsList() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rois/list`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching ROIs list:', error);
    throw error;
  }
}

/**
 * Obtiene detalles de una ROI específica
 * @param {number} roiId - ID de la ROI
 * @returns {Promise<Object>} - Detalles de la ROI
 */
export async function getROIDetails(roiId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rois/${roiId}`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching ROI details:', error);
    throw error;
  }
}

/**
 * Actualiza una ROI existente
 * @param {number} roiId - ID de la ROI
 * @param {Object} roiData - { name, description, coordinates }
 * @returns {Promise<Object>} - ROI actualizada
 */
export async function updateROI(roiId, roiData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rois/${roiId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(roiData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error updating ROI:', error);
    throw error;
  }
}

/**
 * Elimina una ROI
 * @param {number} roiId - ID de la ROI
 * @returns {Promise<Object>} - Respuesta del servidor
 */
export async function deleteROI(roiId) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/rois/${roiId}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error deleting ROI:', error);
    throw error;
  }
}

// ========================
// SIMULACIÓN (Simulation)
// ========================

/**
 * Inicia una nueva simulación
 * @param {Object} simulationData - { name, parameters }
 * @returns {Promise<Object>} - Simulación creada
 */
export async function startSimulation(simulationData) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/simulate/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(simulationData),
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error starting simulation:', error);
    throw error;
  }
}

/**
 * Obtiene el estado de una simulación
 * @param {number} simulationId - ID de la simulación
 * @returns {Promise<Object>} - Estado de la simulación
 */
export async function getSimulationStatus(simulationId) {
  try {
    const response = await fetch(
      `${API_BASE_URL}/api/simulate/${simulationId}`
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching simulation status:', error);
    throw error;
  }
}

/**
 * Obtiene lista de todas las simulaciones
 * @returns {Promise<Object>} - Lista de simulaciones
 */
export async function listSimulations() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/simulate/list`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching simulations list:', error);
    throw error;
  }
}

// ========================
// HEALTH & STATUS
// ========================

/**
 * Verifica que la API está en línea
 * @returns {Promise<boolean>} - true si está ok
 */
export async function healthCheck() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`);
    return response.ok;
  } catch (error) {
    console.error('Health check failed:', error);
    return false;
  }
}

/**
 * Obtiene status detallado de la API
 * @returns {Promise<Object>} - Status de API, DB, S3
 */
export async function getAPIStatus() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/status`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching API status:', error);
    throw error;
  }
}

// ========================
// EJEMPLOS DE USO
// ========================

/**
 * 
 * // 1. CREAR UNA ROI (plaza)
 * const newROI = await createROI({
 *   name: "Plaza A1",
 *   description: "normal",
 *   coordinates: [[100, 100], [200, 100], [200, 200], [100, 200]]
 * });
 * 
 * // 2. LISTAR TODAS LAS ROIs
 * const rois = await getROIsList();
 * console.log('ROIs:', rois);
 * 
 * // 3. SUBIR IMAGEN Y DETECTAR
 * const file = document.getElementById('imageInput').files[0];
 * const result = await uploadAndDetect(file);
 * console.log('Detección:', result);
 * // Resultado incluye:
 * // - total_spots: número total de plazas
 * // - free_spots: plazas libres
 * // - occupied_spots: plazas ocupadas
 * // - details: detalles de cada plaza
 * // - s3_url: URL de la imagen en S3
 * 
 * // 4. OBTENER HISTORIAL DE DETECCIONES
 * const history = await getDetectionHistory(50);
 * console.log('Últimas detecciones:', history.detections);
 * 
 * // 5. INICIAR SIMULACIÓN
 * const simulation = await startSimulation({
 *   name: "Simulación de ocupación",
 *   parameters: { duration: 60, vehicle_count: 5 }
 * });
 * 
 */
