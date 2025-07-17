import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import DataExportService, { ExportFormat, ExportOptions } from '../services/DataExportService';

interface DataExportModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
}

const DataExportModal: React.FC<DataExportModalProps> = ({ visible, onClose, userId }) => {
  // State for export options
  const [format, setFormat] = useState<ExportFormat>(ExportFormat.JSON);
  const [includeMusic, setIncludeMusic] = useState<boolean>(false);
  const [useCustomDateRange, setUseCustomDateRange] = useState<boolean>(false);
  const [startDate, setStartDate] = useState<Date>(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)); // 30 days ago
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [showStartDatePicker, setShowStartDatePicker] = useState<boolean>(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState<boolean>(false);
  
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
  
  // Handle date change
  const onStartDateChange = (event: any, selectedDate?: Date) => {
    setShowStartDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };
  
  const onEndDateChange = (event: any, selectedDate?: Date) => {
    setShowEndDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };
  
  // Format date for display
  const formatDate = (date: Date): string => {
    return date.toLocaleDateString();
  };
  
  // Handle export
  const handleExport = async () => {
    try {
      setIsExporting(true);
      
      // Prepare export options
      const options: ExportOptions = {
        format,
        includeMusic,
        ...(useCustomDateRange ? { startDate, endDate } : {})
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
  
  // Render option button
  const renderOptionButton = (
    title: string,
    selected: boolean,
    onPress: () => void
  ) => (
    <TouchableOpacity
      style={[styles.optionButton, selected && styles.selectedOption]}
      onPress={onPress}
    >
      <Text style={[styles.optionText, selected && styles.selectedOptionText]}>
        {title}
      </Text>
      {selected && (
        <Ionicons name="checkmark-circle" size={20} color="#4CAF50" style={styles.checkIcon} />
      )}
    </TouchableOpacity>
  );
  
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
                <Text style={styles.sectionTitle}>Format</Text>
                <View style={styles.optionsRow}>
                  {renderOptionButton(
                    'JSON',
                    format === ExportFormat.JSON,
                    () => setFormat(ExportFormat.JSON)
                  )}
                  {renderOptionButton(
                    'CSV',
                    format === ExportFormat.CSV,
                    () => setFormat(ExportFormat.CSV)
                  )}
                </View>
              </View>
              
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Include Music Data</Text>
                <View style={styles.optionsRow}>
                  {renderOptionButton(
                    'Yes',
                    includeMusic,
                    () => setIncludeMusic(true)
                  )}
                  {renderOptionButton(
                    'No',
                    !includeMusic,
                    () => setIncludeMusic(false)
                  )}
                </View>
              </View>
              
              <View style={styles.section}>
                <View style={styles.dateRangeHeader}>
                  <Text style={styles.sectionTitle}>Date Range</Text>
                  <TouchableOpacity
                    style={styles.customRangeToggle}
                    onPress={() => setUseCustomDateRange(!useCustomDateRange)}
                  >
                    <View style={[
                      styles.checkbox,
                      useCustomDateRange && styles.checkboxChecked
                    ]}>
                      {useCustomDateRange && (
                        <Ionicons name="checkmark" size={16} color="#fff" />
                      )}
                    </View>
                    <Text style={styles.customRangeText}>Custom Range</Text>
                  </TouchableOpacity>
                </View>
                
                {useCustomDateRange && (
                  <View style={styles.datePickerContainer}>
                    <View style={styles.datePickerRow}>
                      <Text style={styles.dateLabel}>Start:</Text>
                      <TouchableOpacity
                        style={styles.datePicker}
                        onPress={() => setShowStartDatePicker(true)}
                      >
                        <Text style={styles.dateText}>{formatDate(startDate)}</Text>
                        <Ionicons name="calendar-outline" size={20} color="#555" />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.datePickerRow}>
                      <Text style={styles.dateLabel}>End:</Text>
                      <TouchableOpacity
                        style={styles.datePicker}
                        onPress={() => setShowEndDatePicker(true)}
                      >
                        <Text style={styles.dateText}>{formatDate(endDate)}</Text>
                        <Ionicons name="calendar-outline" size={20} color="#555" />
                      </TouchableOpacity>
                    </View>
                    
                    {showStartDatePicker && (
                      <DateTimePicker
                        value={startDate}
                        mode="date"
                        display="default"
                        onChange={onStartDateChange}
                        maximumDate={endDate}
                      />
                    )}
                    
                    {showEndDatePicker && (
                      <DateTimePicker
                        value={endDate}
                        mode="date"
                        display="default"
                        onChange={onEndDateChange}
                        minimumDate={startDate}
                        maximumDate={new Date()}
                      />
                    )}
                  </View>
                )}
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
                    <Text style={styles.exportButtonText}>Export Data</Text>
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