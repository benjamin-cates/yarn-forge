import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PhysicsConfig } from '../elements/PhysicsConfig';
import type { PhysConfig } from '../simulation/phys';

describe('PhysicsConfig Component', () => {
    const defaultPhys: PhysConfig = {
        iterations: 100,
        spring_constant: 0.5,
        ortho_constant: 0.1,
        repulsionStrength: 1,
        repulsionRadius: 2,
        repulsionMode: 'stochastic',
        lambda: 0.33,
    };

    const mockProps = {
        phys: defaultPhys,
        setPhys: vi.fn(),
        experimental: false,
        setExperimental: vi.fn(),
    };

    it('renders correctly in non-experimental mode', () => {
        render(<PhysicsConfig {...mockProps} />);

        expect(screen.getByText(/Simulation Config/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Experimental/i)).toBeInTheDocument();
        expect(screen.getByText(/Simulation steps: 100/i)).toBeInTheDocument();
        // Stretchiness = 1 / 0.5 - 1 = 2 - 1 = 1.00
        expect(screen.getByText(/Stretchiness: 1.00/i)).toBeInTheDocument();
        expect(screen.getByText(/Stuffing/i)).toBeInTheDocument();

        // Buttons for stuffing
        expect(screen.getByRole('button', { name: /None/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Light/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Full/i })).toBeInTheDocument();

        // Should NOT show experimental fields
        expect(screen.queryByText(/Spring constant:/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Orthogonality:/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Lambda \(λ\):/i)).not.toBeInTheDocument();
    });

    it('renders correctly in experimental mode', () => {
        render(<PhysicsConfig {...mockProps} experimental={true} />);

        expect(screen.getByText(/Simulation steps: 100/i)).toBeInTheDocument();
        expect(screen.getByText(/Spring constant: 0.50/i)).toBeInTheDocument();
        expect(screen.getByText(/Orthogonality: 0.10/i)).toBeInTheDocument();
        expect(screen.getByText(/Lambda \(λ\): 0.33/i)).toBeInTheDocument();
        expect(screen.getByText(/Repulsion: 1.00/i)).toBeInTheDocument();
        expect(screen.getByText(/Repulsion radius: 2.0/i)).toBeInTheDocument();
        expect(screen.getByText(/Repulsion Mode/i)).toBeInTheDocument();

        // Should NOT show non-experimental fields
        expect(screen.queryByText(/Stretchiness:/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/Stuffing/i)).not.toBeInTheDocument();
    });

    it('calls setExperimental when checkbox is toggled', () => {
        render(<PhysicsConfig {...mockProps} />);
        const checkbox = screen.getByLabelText(/Experimental/i);

        fireEvent.click(checkbox);
        expect(mockProps.setExperimental).toHaveBeenCalledWith(true);
    });

    it('calls setPhys for simulation steps slider', () => {
        render(<PhysicsConfig {...mockProps} />);
        const sliders = screen.getAllByRole('slider');
        // First slider is iterations
        fireEvent.change(sliders[0], { target: { value: '150' } });

        // setPhys is called with a function because it uses (prev) => ({...prev, ...updates})
        expect(mockProps.setPhys).toHaveBeenCalled();
        const updater = mockProps.setPhys.mock.calls[0][0];
        const result = updater(defaultPhys);
        expect(result.iterations).toBe(150);
    });

    it('calls setPhys for stretchiness slider (non-experimental)', () => {
        render(<PhysicsConfig {...mockProps} />);
        const sliders = screen.getAllByRole('slider');
        // Second slider is stretchiness
        fireEvent.change(sliders[1], { target: { value: '0' } });

        expect(mockProps.setPhys).toHaveBeenCalled();
        const updater = mockProps.setPhys.mock.calls[mockProps.setPhys.mock.calls.length - 1][0];
        const result = updater(defaultPhys);
        // spring_constant = 1 / (0 + 1) = 1
        expect(result.spring_constant).toBe(1);
    });

    it('calls setPhys for spring constant slider (experimental)', () => {
        render(<PhysicsConfig {...mockProps} experimental={true} />);
        const sliders = screen.getAllByRole('slider');
        // In experimental mode:
        // 0: iterations
        // 1: spring_constant
        fireEvent.change(sliders[1], { target: { value: '0.75' } });

        const updater = mockProps.setPhys.mock.calls[mockProps.setPhys.mock.calls.length - 1][0];
        const result = updater(defaultPhys);
        expect(result.spring_constant).toBe(0.75);
    });

    it('calls setPhys for orthogonality slider (experimental)', () => {
        render(<PhysicsConfig {...mockProps} experimental={true} />);
        const sliders = screen.getAllByRole('slider');
        // 2: ortho_constant
        fireEvent.change(sliders[2], { target: { value: '0.5' } });

        const updater = mockProps.setPhys.mock.calls[mockProps.setPhys.mock.calls.length - 1][0];
        const result = updater(defaultPhys);
        expect(result.ortho_constant).toBe(0.5);
    });

    it('calls setPhys for lambda slider (experimental)', () => {
        render(<PhysicsConfig {...mockProps} experimental={true} />);
        const sliders = screen.getAllByRole('slider');
        // 3: lambda
        fireEvent.change(sliders[3], { target: { value: '0.1' } });

        const updater = mockProps.setPhys.mock.calls[mockProps.setPhys.mock.calls.length - 1][0];
        const result = updater(defaultPhys);
        expect(result.lambda).toBe(0.1);
    });

    it('calls setPhys for repulsion slider (experimental)', () => {
        render(<PhysicsConfig {...mockProps} experimental={true} />);
        const sliders = screen.getAllByRole('slider');
        // 4: repulsionStrength
        fireEvent.change(sliders[4], { target: { value: '2.5' } });

        const updater = mockProps.setPhys.mock.calls[mockProps.setPhys.mock.calls.length - 1][0];
        const result = updater(defaultPhys);
        expect(result.repulsionStrength).toBe(2.5);
    });

    it('calls setPhys for repulsion radius slider (experimental)', () => {
        render(<PhysicsConfig {...mockProps} experimental={true} />);
        const sliders = screen.getAllByRole('slider');
        // 5: repulsionRadius
        fireEvent.change(sliders[5], { target: { value: '5.0' } });

        const updater = mockProps.setPhys.mock.calls[mockProps.setPhys.mock.calls.length - 1][0];
        const result = updater(defaultPhys);
        expect(result.repulsionRadius).toBe(5);
    });

    it('calls setPhys when stuffing buttons are clicked', () => {
        render(<PhysicsConfig {...mockProps} />);
        const fullButton = screen.getByRole('button', { name: /Full/i });

        fireEvent.click(fullButton);
        const updater = mockProps.setPhys.mock.calls[mockProps.setPhys.mock.calls.length - 1][0];
        const result = updater(defaultPhys);
        expect(result.repulsionStrength).toBe(3);
    });

    it('calls setPhys when repulsion mode is changed (experimental)', () => {
        render(<PhysicsConfig {...mockProps} experimental={true} />);
        const select = screen.getByRole('combobox');

        fireEvent.change(select, { target: { value: 'grid_inflation' } });
        const updater = mockProps.setPhys.mock.calls[mockProps.setPhys.mock.calls.length - 1][0];
        const result = updater(defaultPhys);
        expect(result.repulsionMode).toBe('grid_inflation');
    });
});
