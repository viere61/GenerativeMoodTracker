import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DataExportService, { ExportFormat, ExportOptions } from '../services/DataExportService';

interface DataExportModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

const DataExportModal: React.FC<DataExportModalProps> = ({ visible, onClose, userId }) => {
  // Simplified export: always CSV with music included
  
  // State for export process
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [hasData, setHasData] = useState<boolean>(true);
  
  // Check if user has data to export
  useEffect(() => {
    const checkData = async () => {
      const hasDataToExport = await DataExportService.hasDataToExport(userId);
      setHasData(hasDataToExport);
    };
    
    if (visible) {
      checkData();
    }
  }, [visible, userId]);
  
  // Handle export
  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Prepare export options
      const options: ExportOptions = {
        format: ExportFormat.CSV,
        includeMusic: true
      };
      
      // Export data
      const filePath = await DataExportService.exportUserData(userId, options);
      
      // Share the exported file
      const shared = await DataExportService.shareExportedFile(filePath);
      
      if (!shared) {
        Alert.alert(
          'Export Complete',
          `Your data has been exported to ${filePath}`,
          [{ text: 'OK' }]
        );
      }
      
      setIsExporting(false);
      onClose();
    } catch (error) {
      console.error('Export failed:', error);
      Alert.alert(
        'Export Failed',
        'There was an error exporting your data. Please try again.',
        [{ text: 'OK' }]
      );
      setIsExporting(false);
    }
  };
  
  // Options UI removed
  
  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.header}>
            <Text style={styles.title}>Export Data</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          {!hasData ? (
            <View style={styles.noDataContainer}>
              <Ionicons name="information-circle-outline" size={48} color="#888" />
              <Text style={styles.noDataText}>
                No data available to export. Start tracking your mood to generate exportable data.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Export</Text>
                <Text style={{ color: '#555', marginBottom: 8 }}>A CSV file including your music data will be generated.</Text>
              </View>
              <TouchableOpacity
                style={styles.exportButton}
                onPress={handleExport}
                disabled={isExporting}
              >
                {isExporting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="download-outline" size={20} color="#fff" style={styles.buttonIcon} />
                    <Text style={styles.exportButtonText}>Export CSV with music</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333'
  },
  closeButton: {
    padding: 5
  },
  section: {
    marginBottom: 20
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333'
  },
  optionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap'
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
    marginRight: 10,
    marginBottom: 10
  },
  selectedOption: {
    borderColor: '#4CAF50',
    backgroundColor: 'rgba(76, 175, 80, 0.1)'
  },
  optionText: {
    color: '#555'
  },
  selectedOptionText: {
    color: '#4CAF50',
    fontWeight: '600'
  },
  checkIcon: {
    marginLeft: 5
  },
  dateRangeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  customRangeToggle: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#aaa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50'
  },
  customRangeText: {
    color: '#555',
    fontSize: 14
  },
  datePickerContainer: {
    marginTop: 10
  },
  datePickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10
  },
  dateLabel: {
    width: 50,
    fontSize: 14,
    color: '#555'
  },
  datePicker: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd'
  },
  dateText: {
    color: '#333'
  },
  exportButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 8,
    paddingVertical: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center'
  },
  exportButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 16
  },
  buttonIcon: {
    marginRight: 8
  },
  noDataContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20
  },
  noDataText: {
    textAlign: 'center',
    color: '#666',
    marginTop: 10,
    fontSize: 16
  }
});

export default DataExportModal;