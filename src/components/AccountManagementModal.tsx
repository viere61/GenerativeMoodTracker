import React, { useState, useContext } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TextInput, 
  Button, 
  Alert, 
  TouchableOpacity,
  ScrollView
} from 'react-native';
import { AuthContext } from '../contexts/AuthContext';
import AuthService from '../services/AuthService';

interface AccountManagementModalProps {
  visible: boolean;
  onClose: () => void;
}

const AccountManagementModal: React.FC<AccountManagementModalProps> = ({ visible, onClose }) => {
  // State for the active tab
  const [activeTab, setActiveTab] = useState<'password' | 'delete'>('password');
  
  // State for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // State for account deletion
  const [deletePassword, setDeletePassword] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  
  // Get auth context
  const { authState, logout } = useContext(AuthContext);
  
  // Handle password change
  const handlePasswordChange = async () => {
    try {
      // Validate inputs
      if (!currentPassword) {
        Alert.alert('Error', 'Please enter your current password');
        return;
      }
      
      if (!newPassword) {
        Alert.alert('Error', 'Please enter a new password');
        return;
      }
      
      if (newPassword !== confirmPassword) {
        Alert.alert('Error', 'New passwords do not match');
        return;
      }
      
      // Validate password strength
      if (newPassword.length < 8) {
        Alert.alert('Error', 'Password must be at least 8 characters long');
        return;
      }
      
      // Change the password
      const success = await AuthService.changePassword(currentPassword, newPassword);
      
      if (success) {
        Alert.alert('Success', 'Password changed successfully');
        
        // Clear the form
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        
        // Close the modal
        onClose();
      }
    } catch (error) {
      console.error('Password change error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to change password');
    }
  };
  
  // Handle account deletion
  const handleDeleteAccount = async () => {
    try {
      // Validate inputs
      if (!deletePassword) {
        Alert.alert('Error', 'Please enter your password');
        return;
      }
      
      if (!confirmDelete) {
        Alert.alert('Error', 'Please confirm account deletion');
        return;
      }
      
      // Show a final confirmation dialog
      Alert.alert(
        'Confirm Account Deletion',
        'This action cannot be undone. All your data will be permanently deleted. Are you sure?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              try {
                // Delete the account
                await AuthService.deleteAccount(deletePassword);
                
                // Log out
                await logout();
                
                // Close the modal
                onClose();
                
                // Show success message
                Alert.alert('Account Deleted', 'Your account has been deleted successfully');
              } catch (error) {
                console.error('Account deletion error:', error);
                Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete account');
              }
            },
          },
        ],
        { cancelable: true }
      );
    } catch (error) {
      console.error('Account deletion error:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to delete account');
    }
  };
  
  // Handle password reset request
  const handlePasswordReset = async () => {
    try {
      if (!authState.user?.email) {
        Alert.alert('Error', 'User email not found');
        return;
      }
      
      // Request password reset
      await AuthService.requestPasswordReset(authState.user.email);
      
      Alert.alert(
        'Password Reset Requested',
        'If an account exists with this email, you will receive password reset instructions.'
      );
    } catch (error) {
      console.error('Password reset error:', error);
      Alert.alert('Error', 'Failed to request password reset');
    }
  };
  
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Account Management</Text>
          
          {/* Tab Navigation */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'password' && styles.activeTab,
              ]}
              onPress={() => setActiveTab('password')}
            >
              <Text style={activeTab === 'password' ? styles.activeTabText : styles.tabText}>
                Change Password
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.tab,
                activeTab === 'delete' && styles.activeTab,
              ]}
              onPress={() => setActiveTab('delete')}
            >
              <Text style={activeTab === 'delete' ? styles.activeTabText : styles.tabText}>
                Delete Account
              </Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.scrollContent}>
            {/* Password Change Tab */}
            {activeTab === 'password' && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionDescription}>
                  Change your account password. Make sure to use a strong, unique password.
                </Text>
                
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Current Password:</Text>
                  <TextInput
                    style={styles.input}
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                    placeholder="Enter current password"
                    secureTextEntry={true}
                  />
                </View>
                
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>New Password:</Text>
                  <TextInput
                    style={styles.input}
                    value={newPassword}
                    onChangeText={setNewPassword}
                    placeholder="Enter new password"
                    secureTextEntry={true}
                  />
                </View>
                
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Confirm New Password:</Text>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    placeholder="Confirm new password"
                    secureTextEntry={true}
                  />
                </View>
                
                <View style={styles.passwordRequirements}>
                  <Text style={styles.requirementText}>
                    Password must be at least 8 characters long
                  </Text>
                </View>
                
                <View style={styles.buttonContainer}>
                  <Button title="Change Password" onPress={handlePasswordChange} />
                </View>
                
                <TouchableOpacity 
                  style={styles.forgotPasswordLink}
                  onPress={handlePasswordReset}
                >
                  <Text style={styles.forgotPasswordText}>Forgot your password?</Text>
                </TouchableOpacity>
              </View>
            )}
            
            {/* Delete Account Tab */}
            {activeTab === 'delete' && (
              <View style={styles.tabContent}>
                <Text style={styles.sectionDescription}>
                  Permanently delete your account and all associated data. This action cannot be undone.
                </Text>
                
                <View style={styles.inputRow}>
                  <Text style={styles.inputLabel}>Password:</Text>
                  <TextInput
                    style={styles.input}
                    value={deletePassword}
                    onChangeText={setDeletePassword}
                    placeholder="Enter your password"
                    secureTextEntry={true}
                  />
                </View>
                
                <View style={styles.checkboxRow}>
                  <TouchableOpacity
                    style={[styles.checkbox, confirmDelete && styles.checkboxChecked]}
                    onPress={() => setConfirmDelete(!confirmDelete)}
                  >
                    {confirmDelete && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>
                    I understand that this action is permanent and cannot be undone
                  </Text>
                </View>
                
                <View style={styles.buttonContainer}>
                  <Button 
                    title="Delete Account" 
                    onPress={handleDeleteAccount} 
                    color="red" 
                  />
                </View>
              </View>
            )}
          </ScrollView>
          
          <View style={styles.modalButtons}>
            <Button title="Close" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#CCCCCC',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#007AFF',
  },
  tabText: {
    color: '#666666',
  },
  activeTabText: {
    color: '#007AFF',
    fontWeight: 'bold',
  },
  scrollContent: {
    maxHeight: 400,
  },
  tabContent: {
    paddingVertical: 10,
  },
  sectionDescription: {
    marginBottom: 15,
    textAlign: 'center',
  },
  inputRow: {
    marginBottom: 15,
  },
  inputLabel: {
    marginBottom: 5,
    fontWeight: 'bold',
  },
  input: {
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 5,
    padding: 10,
    fontSize: 16,
  },
  passwordRequirements: {
    marginBottom: 15,
  },
  requirementText: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    borderRadius: 3,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkmark: {
    color: 'white',
    fontSize: 14,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 14,
  },
  buttonContainer: {
    marginVertical: 10,
  },
  forgotPasswordLink: {
    alignItems: 'center',
    marginTop: 10,
  },
  forgotPasswordText: {
    color: '#007AFF',
    fontSize: 14,
  },
  modalButtons: {
    marginTop: 15,
  },
});

export default AccountManagementModal;