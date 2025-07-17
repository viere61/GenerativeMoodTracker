import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import MoodRatingSelector from '../MoodRatingSelector';

describe('MoodRatingSelector', () => {
  it('renders correctly with default props', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <MoodRatingSelector value={null} onChange={onChange} />
    );
    
    // Should display title
    expect(getByText('Mood Rating (1-10)')).toBeTruthy();
    
    // Should display description
    expect(getByText('Select your mood')).toBeTruthy();
    
    // Should display all rating buttons from 1 to 10
    for (let i = 1; i <= 10; i++) {
      expect(getByText(i.toString())).toBeTruthy();
    }
    
    // Should display scale labels
    expect(getByText('Negative')).toBeTruthy();
    expect(getByText('Positive')).toBeTruthy();
  });
  
  it('calls onChange when a rating is selected', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <MoodRatingSelector value={null} onChange={onChange} />
    );
    
    // Click on rating 5
    fireEvent.press(getByText('5'));
    
    // Should call onChange with the selected rating
    expect(onChange).toHaveBeenCalledWith(5);
  });
  
  it('displays the correct description based on selected rating', () => {
    const onChange = jest.fn();
    
    // Test very negative rating
    const { getByText, rerender } = render(
      <MoodRatingSelector value={2} onChange={onChange} />
    );
    expect(getByText('Very negative 😢')).toBeTruthy();
    
    // Test negative rating
    rerender(<MoodRatingSelector value={4} onChange={onChange} />);
    expect(getByText('Negative 😕')).toBeTruthy();
    
    // Test neutral rating
    rerender(<MoodRatingSelector value={6} onChange={onChange} />);
    expect(getByText('Neutral 😐')).toBeTruthy();
    
    // Test positive rating
    rerender(<MoodRatingSelector value={8} onChange={onChange} />);
    expect(getByText('Positive 🙂')).toBeTruthy();
    
    // Test very positive rating
    rerender(<MoodRatingSelector value={10} onChange={onChange} />);
    expect(getByText('Very positive 😄')).toBeTruthy();
  });
  
  it('supports custom min and max ratings', () => {
    const onChange = jest.fn();
    const { getByText, queryByText } = render(
      <MoodRatingSelector value={null} onChange={onChange} minRating={1} maxRating={5} />
    );
    
    // Should display title with custom range
    expect(getByText('Mood Rating (1-5)')).toBeTruthy();
    
    // Should only display ratings from 1 to 5
    for (let i = 1; i <= 5; i++) {
      expect(getByText(i.toString())).toBeTruthy();
    }
    
    // Should not display ratings above 5
    expect(queryByText('6')).toBeNull();
  });

  it('calls onValidationChange with correct validation state', () => {
    const onChange = jest.fn();
    const onValidationChange = jest.fn();
    
    // Initial render with null value should call onValidationChange with false
    const { getByText, rerender } = render(
      <MoodRatingSelector 
        value={null} 
        onChange={onChange} 
        onValidationChange={onValidationChange} 
      />
    );
    
    expect(onValidationChange).toHaveBeenCalledWith(false);
    
    // Rerender with a valid value should call onValidationChange with true
    rerender(
      <MoodRatingSelector 
        value={5} 
        onChange={onChange} 
        onValidationChange={onValidationChange} 
      />
    );
    
    expect(onValidationChange).toHaveBeenCalledWith(true);
  });
  
  it('displays validation message when no rating is selected', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <MoodRatingSelector value={null} onChange={onChange} />
    );
    
    expect(getByText('Please select a mood rating')).toBeTruthy();
  });
  
  it('does not display validation message when a rating is selected', () => {
    const onChange = jest.fn();
    const { queryByText } = render(
      <MoodRatingSelector value={5} onChange={onChange} />
    );
    
    expect(queryByText('Please select a mood rating')).toBeNull();
  });
  
  it('applies correct styling to selected rating button', () => {
    const onChange = jest.fn();
    const { getByText } = render(
      <MoodRatingSelector value={5} onChange={onChange} />
    );
    
    // The selected button should have a different style
    const selectedButton = getByText('5').parentNode;
    expect(selectedButton).toHaveStyle({ transform: [{ scale: 1.1 }] });
  });
});