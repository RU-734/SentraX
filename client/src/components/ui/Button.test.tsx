import React from 'react';
import { render, screen } from '@testing-library/react';
import Button from './Button'; // Default export

describe('Button Component', () => {
  test('renders with children text', () => {
    const buttonText = 'Click Me';
    render(<Button>{buttonText}</Button>);
    
    // Check if the button is in the document and contains the text
    const buttonElement = screen.getByRole('button', { name: buttonText });
    expect(buttonElement).toBeInTheDocument();
    
    // Also, a more direct check for the text content within the button
    expect(screen.getByText(buttonText)).toBeInTheDocument();
  });

  test('applies className prop', () => {
    const buttonText = 'Styled Button';
    const customClass = 'my-custom-class';
    render(<Button className={customClass}>{buttonText}</Button>);
    
    const buttonElement = screen.getByRole('button', { name: buttonText });
    expect(buttonElement).toHaveClass(customClass);
    expect(buttonElement).toHaveClass('px-4'); // Example of default class
  });

  test('handles onClick event', () => {
    const buttonText = 'Clickable';
    const handleClick = jest.fn(); // Mock function
    
    render(<Button onClick={handleClick}>{buttonText}</Button>);
    
    const buttonElement = screen.getByRole('button', { name: buttonText });
    buttonElement.click();
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
