// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { useHorizontalWheel } from './useHorizontalWheel';

function Strip() {
  return <div ref={useHorizontalWheel()} data-testid="bande" />;
}

/** jsdom ne calcule pas la mise en page : on fixe les dimensions à la main. */
function renderStrip({ scrollLeft = 0, scrollWidth = 500, clientWidth = 200 } = {}) {
  render(<Strip />);
  const strip = screen.getByTestId('bande');
  Object.defineProperty(strip, 'scrollWidth', { value: scrollWidth });
  Object.defineProperty(strip, 'clientWidth', { value: clientWidth });
  strip.scrollLeft = scrollLeft;
  return strip;
}

const wheel = (strip: HTMLElement, deltaY: number, deltaX = 0) => {
  const event = new WheelEvent('wheel', { deltaY, deltaX, bubbles: true, cancelable: true });
  strip.dispatchEvent(event);
  return event;
};

afterEach(cleanup);

describe('useHorizontalWheel', () => {
  it('fait défiler vers la droite avec la molette vers le bas', () => {
    const strip = renderStrip();

    const event = wheel(strip, 100);

    expect(strip.scrollLeft).toBe(100);
    expect(event.defaultPrevented).toBe(true);
  });

  it('fait défiler vers la gauche avec la molette vers le haut', () => {
    const strip = renderStrip({ scrollLeft: 150 });

    wheel(strip, -100);

    expect(strip.scrollLeft).toBe(50);
  });

  it('convertit en pixels un défilement exprimé en lignes (Firefox)', () => {
    const strip = renderStrip();

    strip.dispatchEvent(
      new WheelEvent('wheel', { deltaY: 3, deltaMode: WheelEvent.DOM_DELTA_LINE, cancelable: true })
    );

    expect(strip.scrollLeft).toBe(48);
  });

  it('laisse la page défiler quand la bande est déjà au bout', () => {
    const strip = renderStrip({ scrollLeft: 300 });

    const event = wheel(strip, 100);

    expect(event.defaultPrevented).toBe(false);
  });

  it('laisse la page défiler quand la bande ne déborde pas', () => {
    const strip = renderStrip({ scrollWidth: 200 });

    expect(wheel(strip, -100).defaultPrevented).toBe(false);
    expect(wheel(strip, 100).defaultPrevented).toBe(false);
  });

  it('laisse faire le défilement horizontal natif du pavé tactile', () => {
    const strip = renderStrip();

    const event = wheel(strip, 10, 80);

    expect(strip.scrollLeft).toBe(0);
    expect(event.defaultPrevented).toBe(false);
  });
});
