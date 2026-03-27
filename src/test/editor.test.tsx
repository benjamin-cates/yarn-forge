import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Editor from '../elements/editor';

describe('Editor Component', () => {
    const mockProps = {
        patterns: [],
        setPatterns: vi.fn(),
        sphereColor: '#ffffff',
        setSphereColor: vi.fn(),
        lineColor: '#ffffff',
        setLineColor: vi.fn(),
        totalStitches: 6,
        hasChanges: false,
        handleRender: vi.fn(),
        needsManualRender: true,
        texts: ["6sc"],
        setTexts: vi.fn(),
        headers: [{ name: "Piece 1", autoJoin: true, autoTurn: false }],
        setHeaders: vi.fn(),
    };

    it('renders the editor with initial text', () => {
        render(<Editor {...mockProps} />);

        // The editor uses contentEditable, and the text is rendered inside a div with ref={editorRef}
        // and also in an overlay.
        const elements = screen.getAllByText('6sc', { exact: false });
        expect(elements.length).toBeGreaterThan(0);
    });

    it('calls setTexts when content is changed', () => {
        render(<Editor {...mockProps}></Editor>);

        // Find the contentEditable div.
        const editor_sc = screen.getByText("6sc", { exact: false, selector: '[contenteditable="true"]' });

        // Simulate input
        fireEvent.input(editor_sc, { target: { innerText: '12sc' } });

        // PieceEditor calls setText(val, id)
        // Editor calls setTexts(prev => { ... })
        expect(mockProps.setTexts).toHaveBeenCalled();
        const updateFn = mockProps.setTexts.mock.calls[0][0];
        const nextTexts = updateFn(["6sc"]);
        expect(nextTexts).toEqual(["12sc"]);
    });

    it('renders the color pickers', () => {
        render(<Editor {...mockProps} />);

        const spherePicker = document.getElementById('sphere-color-picker');
        const linePicker = document.getElementById('line-color-picker');

        expect(spherePicker).toBeInTheDocument();
        expect(linePicker).toBeInTheDocument();
    });

    it('calls setHeaders when Always Join/Turn buttons are clicked', () => {
        render(<Editor {...mockProps} />);

        const autoJoinButton = screen.getByText(/Always Join/i);
        const autoTurnButton = screen.getByText(/Always Turn/i);

        fireEvent.click(autoJoinButton);
        expect(mockProps.setHeaders).toHaveBeenCalled();
        let updateFn = mockProps.setHeaders.mock.calls[0][0];
        let nextHeaders = updateFn(mockProps.headers);
        expect(nextHeaders[0].autoJoin).toBe(false); // Toggled from true

        fireEvent.click(autoTurnButton);
        expect(mockProps.setHeaders).toHaveBeenCalledTimes(2);
        updateFn = mockProps.setHeaders.mock.calls[1][0];
        nextHeaders = updateFn(mockProps.headers);
        expect(nextHeaders[0].autoTurn).toBe(true); // Toggled from false
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

    //it('displays validation error message when there is a mismatch', () => {
    //    // Validation is now handled inside PieceEditor using parseRows
    //    // To test mismatch, we need to provide text that causes a mismatch
    //    const mismatchProps = {
    //        ...mockProps,
    //        texts: ["6sc\n7sc"], // 7sc expects 7 sts in prev, but got 6
    //    };
    //    render(<Editor {...mismatchProps} />);

    //    expect(screen.getByText(/Mismatch! Expected 7 sts in prev layer./i)).toBeInTheDocument();
    //});

    it('displays output stitches count when valid', () => {
        render(<Editor {...mockProps} />);

        // "6sc" should produce "6" stitches
        expect(screen.getByText('6')).toBeInTheDocument();
    });

    it('applies error color to text when parse errors occur', () => {
        const errorProps = {
            ...mockProps,
            texts: ["invalid text"],
        };
        render(<Editor {...errorProps} />);

        const lineDiv = screen.getByText('invalid text').closest('.editor-line');
        expect(lineDiv).toHaveClass('error');
    });

    it('hides render button when needsManualRender is false', () => {
        render(<Editor {...mockProps} needsManualRender={false} />);

        const renderButton = screen.queryByRole('button', { name: /Up to Date/i });
        expect(renderButton).not.toBeInTheDocument();
    });
});
