import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EmotionTagSelector from '../EmotionTagSelector';

describe('EmotionTagSelector', () => {
  it('renders correctly with default props', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <EmotionTagSelector selectedTags={[]} onChange={onChange} />
    );
    
    // Should display title
    expect(getByText('How are you feeling?')).toBeTruthy();
    
    // Should display subtitle
    expect(getByText('Select all emotions that apply')).toBeTruthy();
    
    // Should display section titles
    expect(getByText('Positive')).toBeTruthy();
    expect(getByText('Challenging')).toBeTruthy();
    
    // Should display some default emotion tags
    expect(getByText('Happy')).toBeTruthy();
    expect(getByText('Sad')).toBeTruthy();
    expect(getByText('Anxious')).toBeTruthy();
  });
  
  it('calls onChange when a tag is selected', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <EmotionTagSelector selectedTags={[]} onChange={onChange} />
    );
    
    // Click on Happy tag
    fireEvent.press(getByText('Happy'));
    
    // Should call onChange with the selected tag
    expect(onChange).toHaveBeenCalledWith(['Happy']);
  });
  
  it('calls onChange when a tag is deselected', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <EmotionTagSelector selectedTags={['Happy']} onChange={onChange} />
    );
    
    // Click on Happy tag to deselect it
    fireEvent.press(getByText('Happy'));
    
    // Should call onChange with empty array
    expect(onChange).toHaveBeenCalledWith([]);
  });
  
  it('displays selected tags summary', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <EmotionTagSelector selectedTags={['Happy', 'Excited']} onChange={onChange} />
    );
    
    // Should display selected tags count
    expect(getByText('Selected emotions (2):')).toBeTruthy();
    
    // Should display selected tags list
    expect(getByText('Happy, Excited')).toBeTruthy();
  });
  
  it('calls onValidationChange with correct validation state', () => {
    const onChange = jest.fn();
    const onValidationChange = jest.fn();
    
    // Initial render with empty selection should call onValidationChange with false
    const { getByText, rerender } = render(
      <EmotionTagSelector 
        selectedTags={[]} 
        onChange={onChange} 
        onValidationChange={onValidationChange} 
        minSelections={1}
      />
    );
    
    expect(onValidationChange).toHaveBeenCalledWith(false);
    
    // Rerender with a valid selection should call onValidationChange with true
    rerender(
      <EmotionTagSelector 
        selectedTags={['Happy']} 
        onChange={onChange} 
        onValidationChange={onValidationChange} 
        minSelections={1}
      />
    );
    
    expect(onValidationChange).toHaveBeenCalledWith(true);
  });
  
  it('displays validation message when minimum selections not met', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <EmotionTagSelector 
        selectedTags={[]} 
        onChange={onChange} 
        minSelections={1}
      />
    );
    
    expect(getByText('Please select at least 1 emotion tag')).toBeTruthy();
  });
  
  it('does not display validation message when minimum selections are met', () => {
    const onChange = jest.fn();
    const { queryByText } = render(
      <EmotionTagSelector 
        selectedTags={['Happy']} 
        onChange={onChange} 
        minSelections={1}
      />
    );
    
    expect(queryByText('Please select at least 1 emotion tag')).toBeNull();
  });
  
  it('supports custom available tags', () => {
    const onChange = jest.fn();
    const customTags = ['Custom1', 'Custom2', 'Custom3'];
    const { getByText, queryByText } = render(
      <EmotionTagSelector 
        selectedTags={[]} 
        onChange={onChange} 
        availableTags={customTags}
      />
    );
    
    // Should display custom tags
    expect(getByText('Custom1')).toBeTruthy();
    expect(getByText('Custom2')).toBeTruthy();
    expect(getByText('Custom3')).toBeTruthy();
    
    // Should not display default tags
    expect(queryByText('Happy')).toBeNull();
  });
});