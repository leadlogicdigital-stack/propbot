/**
 * CSV Parser for Property Submissions
 * Handles CSV file parsing and validation for bulk property uploads
 */

class CSVParser {
  /**
   * Parse CSV string into objects
   * @param {string} csvContent - Raw CSV content
   * @returns {Array} Array of parsed rows with headers as keys
   */
  static parseCSV(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim());

    if (lines.length < 2) {
      throw new Error('CSV must have header row and at least one data row');
    }

    const headers = this.parseCSVLine(lines[0]);
    const requiredHeaders = ['Name', 'Location', 'PIN Code', 'Property Size (sqft)', 'Cost Per Sqft (₹)', 'Total Cost (₹)', 'Property Type'];

    // Validate headers
    for (const required of requiredHeaders) {
      if (!headers.includes(required)) {
        throw new Error(`Missing required column: ${required}`);
      }
    }

    // Parse data rows
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue; // Skip empty lines

      const values = this.parseCSVLine(line);

      if (values.length !== headers.length) {
        throw new Error(`Row ${i + 1} has ${values.length} columns, expected ${headers.length}`);
      }

      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });

      rows.push(row);
    }

    if (rows.length === 0) {
      throw new Error('No data rows found in CSV');
    }

    if (rows.length > 500) {
      throw new Error('CSV contains too many rows (max 500 per file)');
    }

    return rows;
  }

  /**
   * Parse a single CSV line handling quoted fields
   * @param {string} line - Single CSV line
   * @returns {Array} Array of field values
   */
  static parseCSVLine(line) {
    const result = [];
    let current = '';
    let insideQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (insideQuotes && nextChar === '"') {
          // Handle escaped quotes
          current += '"';
          i++;
        } else {
          // Toggle quote state
          insideQuotes = !insideQuotes;
        }
      } else if (char === ',' && !insideQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current.trim());

    return result;
  }

  /**
   * Validate and convert CSV row to property object
   * @param {Object} row - CSV row object
   * @param {number} rowIndex - Row number for error reporting
   * @returns {Object} Validated property object or error
   */
  static validateAndConvertRow(row, rowIndex) {
    const errors = [];

    // Required fields
    const name = row['Name'] ? row['Name'].trim() : '';
    const location = row['Location'] ? row['Location'].trim() : '';
    const pinCode = row['PIN Code'] ? row['PIN Code'].trim() : '';
    const propertyType = row['Property Type'] ? row['Property Type'].trim().toLowerCase() : '';
    const propertySize = row['Property Size (sqft)'] ? row['Property Size (sqft)'].trim() : '';
    const costPerSqft = row['Cost Per Sqft (₹)'] ? row['Cost Per Sqft (₹)'].trim() : '';
    const totalCost = row['Total Cost (₹)'] ? row['Total Cost (₹)'].trim() : '';

    // Validate required fields
    if (!name) errors.push('Name is required');
    if (!location) errors.push('Location is required');
    if (!pinCode) errors.push('PIN Code is required');
    if (!propertyType) errors.push('Property Type is required');

    // Validate PIN code format (6 digits)
    if (pinCode && !/^\d{6}$/.test(pinCode)) {
      errors.push('PIN Code must be 6 digits');
    }

    // Validate property type
    const validTypes = ['apartment', 'plot', 'villa', 'commercial', 'agricultural'];
    if (propertyType && !validTypes.includes(propertyType)) {
      errors.push(`Property Type must be one of: ${validTypes.join(', ')}`);
    }

    // Validate numeric fields
    if (propertySize && isNaN(parseFloat(propertySize))) {
      errors.push('Property Size must be a number');
    }

    if (costPerSqft && isNaN(parseFloat(costPerSqft))) {
      errors.push('Cost Per Sqft must be a number');
    }

    if (totalCost && isNaN(parseFloat(totalCost))) {
      errors.push('Total Cost must be a number');
    }

    // Check if cost values are reasonable
    if (propertySize && costPerSqft && totalCost) {
      const size = parseFloat(propertySize);
      const cost = parseFloat(costPerSqft);
      const total = parseFloat(totalCost);
      const expectedTotal = size * cost;

      if (Math.abs(expectedTotal - total) > total * 0.1) { // Allow 10% variance
        errors.push(`Total Cost (${total}) doesn't match Property Size × Cost Per Sqft (${expectedTotal})`);
      }
    }

    if (errors.length > 0) {
      return {
        valid: false,
        rowIndex: rowIndex,
        errors: errors
      };
    }

    // Convert to property object
    return {
      valid: true,
      property: {
        property_type: propertyType,
        pin_code: pinCode,
        locality: location,
        property_size: propertySize ? parseInt(propertySize) : null,
        cost_per_sqft: costPerSqft ? parseInt(costPerSqft) : null,
        total_cost: totalCost ? parseInt(totalCost) : null,
        bedrooms: row['Bedrooms'] ? parseInt(row['Bedrooms']) : null,
        amenities: row['Amenities'] ? row['Amenities'].trim() : null,
        additional_info: row['Additional Info'] ? row['Additional Info'].trim() : null
      }
    };
  }

  /**
   * Process entire CSV file
   * @param {string} csvContent - Raw CSV content
   * @returns {Object} Result object with valid and invalid rows
   */
  static processCSV(csvContent) {
    try {
      const rows = this.parseCSV(csvContent);
      const results = {
        total: rows.length,
        valid: [],
        invalid: []
      };

      rows.forEach((row, index) => {
        const validation = this.validateAndConvertRow(row, index + 2); // +2 because row 1 is header, +1 for 1-based indexing

        if (validation.valid) {
          results.valid.push({
            rowIndex: validation.rowIndex,
            property: validation.property
          });
        } else {
          results.invalid.push({
            rowIndex: validation.rowIndex,
            errors: validation.errors
          });
        }
      });

      return results;
    } catch (error) {
      return {
        error: error.message,
        total: 0,
        valid: [],
        invalid: []
      };
    }
  }
}

module.exports = CSVParser;
