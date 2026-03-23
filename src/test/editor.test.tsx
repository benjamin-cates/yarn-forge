import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Editor from '../elements/editor';
import { defaultText } from '../App';

describe('Editor Component', () => {
    const mockProps = {
        text: defaultText,
        setText: vi.fn(),
        autoJoin: false,
        setAutoJoin: vi.fn(),
        autoTurn: false,
        setAutoTurn: vi.fn(),
        sphereColor: '#ffffff',
        setSphereColor: vi.fn(),
        lineColor: '#ffffff',
        setLineColor: vi.fn(),
        totalStitches: 6,
        hasChanges: false,
        handleRender: vi.fn(),
        needsManualRender: true,
        validation: [{ isValid: true, inputStitches: 0, outputStitches: 6 }],
        errors: [false],
    };

    it('renders the editor with initial text', () => {
        render(<Editor {...mockProps} />);

        // The editor uses contentEditable, and the text is rendered inside a div with ref={editorRef}
        // and also in an overlay.
        // Let's look for the text "sc 6"
        const elements = screen.getAllByText('sc 6', { exact: false });
        expect(elements.length).toBeGreaterThan(0);
    });

    it('calls setText when content is changed', () => {
        let editor = <Editor {...mockProps}></Editor>;
        let rendered = render(editor);

        // Find the contentEditable div. It has some specific styles.
        // Based on the code, it's a div with contentEditable property.
        const editor_sc = screen.getByText("6sc", { exact: false, selector: '[contenteditable="true"]' });

        // Simulate input
        fireEvent.input(editor_sc, { target: { innerText: 'sc 12' } });
        expect(mockProps.setText).toHaveBeenCalledWith('sc 12');

        // Rerender with new text
        rendered.rerender(<Editor {...{ ...mockProps, text: "sc 12" }}></Editor>);
        expect(screen.getByText("sc 12")).toBeInTheDocument();
        expect(screen.queryByText("6sc")).not.toBeInTheDocument();
    });

    it('renders the color pickers', () => {
        render(<Editor {...mockProps} />);

        const spherePicker = document.getElementById('sphere-color-picker');
        const linePicker = document.getElementById('line-color-picker');

        expect(spherePicker).toBeInTheDocument();
        expect(linePicker).toBeInTheDocument();
    });

    it('calls setAutoJoin and setAutoTurn when checkboxes are clicked', () => {
        render(<Editor {...mockProps} />);

        const autoJoinCheckbox = screen.getByLabelText(/Auto Join/i);
        const autoTurnCheckbox = screen.getByLabelText(/Auto Turn/i);

        fireEvent.click(autoJoinCheckbox);
        expect(mockProps.setAutoJoin).toHaveBeenCalled();

        fireEvent.click(autoTurnCheckbox);
        expect(mockProps.setAutoTurn).toHaveBeenCalled();
    });

    it('calls setSphereColor and setLineColor when color pickers change', () => {
        render(<Editor {...mockProps} />);

        const spherePicker = document.getElementById('sphere-color-picker') as HTMLInputElement;
        const linePicker = document.getElementById('line-color-picker') as HTMLInputElement;

        fireEvent.change(spherePicker, { target: { value: '#ff0000' } });
        expect(mockProps.setSphereColor).toHaveBeenCalledWith('#ff0000');

        fireEvent.change(linePicker, { target: { value: '#00ff00' } });
        expect(mockProps.setLineColor).toHaveBeenCalledWith('#00ff00');
    });

    it('calls handleRender when render button is clicked', () => {
        render(<Editor {...mockProps} hasChanges={true} />);

        const renderButton = screen.getByText(/Render Changes!/i);
        fireEvent.click(renderButton);

        expect(mockProps.handleRender).toHaveBeenCalled();
    });

    it('displays validation error message when there is a mismatch', () => {
        const validationWithMismatch = [
            { isValid: false, inputStitches: 10, outputStitches: 6 }
        ];
        render(<Editor {...mockProps} validation={validationWithMismatch} />);

        expect(screen.getByText(/Mismatch! Expected 10 sts in prev layer./i)).toBeInTheDocument();
    });

    it('displays output stitches count when valid', () => {
        const validationValid = [
            { isValid: true, inputStitches: 6, outputStitches: 12 }
        ];
        render(<Editor {...mockProps} validation={validationValid} />);

        expect(screen.getByText('12')).toBeInTheDocument();
    });

    it('applies error color to text when errors[i] is true', () => {
        const errors = [true];
        render(<Editor {...mockProps} errors={errors} />);

        const lineSpan = screen.getByText('6sc').parentElement;
        expect(lineSpan).toHaveClass('error');
    });

    it('hides render button when needsManualRender is false', () => {
        render(<Editor {...mockProps} needsManualRender={false} />);

        const renderButton = screen.queryByRole('button', { name: /Up to Date/i });
        expect(renderButton).not.toBeInTheDocument();
    });
});
