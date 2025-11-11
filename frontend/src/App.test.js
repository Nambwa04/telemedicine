import React from 'react';
import { render } from '@testing-library/react';
import App from './App';

// Mock ESM-only or heavy UI libraries that Jest (via CRA) doesn't transform by default
jest.mock('react-calendar', () => () => <div data-testid="calendar-mock" />);
jest.mock('@zegocloud/zego-uikit-prebuilt', () => ({
  ZegoUIKitPrebuilt: { generateKitTokenForTest: () => ({}), create: () => ({ joinRoom: jest.fn() }) }
}));

test('App renders without crashing and mounts root container', () => {
  render(<App />);
  // App root div has className "App app-layout"
  const appRoot = document.querySelector('.App');
  expect(appRoot).toBeTruthy();
});
