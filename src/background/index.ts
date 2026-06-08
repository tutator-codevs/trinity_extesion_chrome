import Browser from 'webextension-polyfill';

Browser.runtime.onInstalled.addListener(() => {
  // eslint-disable-next-line no-console
  console.log('Welcome to chrome ext starter. have a nice day!');
});
