import { Injectable } from '@angular/core';
import { StatusBar } from '@ionic-native/status-bar';

// providers
import { ConfigProvider } from '../config/config';
import { Logger } from '../logger/logger';
import { PlatformProvider } from '../platform/platform';

declare var cordova: any;

@Injectable()
export class ThemeProvider {
  public currentAppTheme: string;

  public availableThemes = {
    light: {
      name: 'Light Mode',
      backgroundColor: '#ffffff',
      fixedScrollBgColor: '#f8f8f9',
      walletDetailsBackgroundStart: '#ffffff',
      walletDetailsBackgroundEnd: '#ffffff'
    },
    dark: {
      name: 'Dark Mode',
      backgroundColor: '#121212',
      fixedScrollBgColor: '#121212',
      walletDetailsBackgroundStart: '#121212',
      walletDetailsBackgroundEnd: '#101010'
    }
  };

  public useSystemTheme: boolean = false;

  constructor(
    private logger: Logger,
    private statusBar: StatusBar,
    private platformProvider: PlatformProvider,
    private configProvider: ConfigProvider
  ) {
    this.logger.debug('ThemeProvider initialized');
  }

  private isEnabled(): boolean {
    const config = this.configProvider.get();
    return !!config.theme.enabled;
  }

  public load() {
    return new Promise(resolve => {
      if (!this.isEnabled()) return resolve();
      const config = this.configProvider.get();
      if (!config.theme.system) {
        this.useSystemTheme = false;
        this.currentAppTheme = config.theme.name;
        this.logger.debug('Set Stored App Theme: ' + this.currentAppTheme);
        return resolve();
      } else {
        // Auto-detect theme
        this.useSystemTheme = true;
        this.getDetectedSystemTheme().then(theme => {
          this.currentAppTheme = theme;
          this.logger.debug('Set System App Theme to: ' + this.currentAppTheme);
          return resolve();
        });
      }
    });
  }

  public getDetectedSystemTheme(): Promise<string> {
    return new Promise(resolve => {
      if (this.platformProvider.isCordova) {
        cordova.plugins.ThemeDetection.isAvailable(
          res => {
            if (res && res.value) {
              cordova.plugins.ThemeDetection.isDarkModeEnabled(
                success => {
                  return resolve(success && success.value ? 'dark' : 'light');
                },
                _ => {
                  return resolve('light');
                }
              );
            } else {
              return resolve('light');
            }
          },
          _ => {
            return resolve('light');
          }
        );
      } else {
        return resolve(
          window.matchMedia &&
            window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
        );
      }
    });
  }

  public apply() {
    if (!this.isEnabled()) return;
    if (this.platformProvider.isCordova) {
      setTimeout(() => {
        if (this.isDarkModeEnabled()) {
          this.useDarkStatusBar();
        } else {
          this.useLightStatusBar();
        }
      }, 100);
    }

    document
      .getElementsByTagName('ion-app')[0]
      .classList.remove('dark', 'light');
    document
      .getElementsByTagName('ion-app')[0]
      .classList.add(this.isDarkModeEnabled() ? 'dark' : 'light');
    this.logger.debug('Apply Theme: ' + this.currentAppTheme);
  }

  public setActiveTheme(theme: string, detectedSystemTheme?: string) {
    switch (theme) {
      case 'system':
        this.useSystemTheme = true;
        this.currentAppTheme = detectedSystemTheme;
        break;
      default:
        this.useSystemTheme = false;
        this.currentAppTheme = theme || detectedSystemTheme;
    }
    this.setConfigTheme();
    this.apply();
  }

  private setConfigTheme(): void {
    let opts = {
      theme: {
        enabled: true,
        name: this.currentAppTheme,
        system: this.useSystemTheme
      }
    };
    this.configProvider.set(opts);
  }

  public getThemeInfo(theme?: string) {
    // If no theme provided returns current theme info
    if (theme && this.availableThemes[theme])
      return this.availableThemes[theme];
    else if (this.availableThemes[this.currentAppTheme])
      return this.availableThemes[this.currentAppTheme];
    else return this.availableThemes['light'];
  }

  public isDarkModeEnabled(): boolean {
    return Boolean(this.currentAppTheme === 'dark');
  }

  public getCurrentAppTheme() {
    if (!this.isEnabled()) return;
    return this.useSystemTheme
      ? 'System Default'
      : this.availableThemes[this.currentAppTheme].name;
  }

  public getSelectedTheme() {
    return this.useSystemTheme ? 'system' : this.currentAppTheme;
  }

  private useDarkStatusBar() {
    this.statusBar.backgroundColorByHexString(
      this.availableThemes['dark'].backgroundColor
    );
    this.statusBar.styleBlackOpaque();
  }

  private useLightStatusBar() {
    this.statusBar.backgroundColorByHexString(
      this.availableThemes['light'].backgroundColor
    );
    this.statusBar.styleDefault();
  }

  public useCustomStatusBar(color) {
    this.statusBar.backgroundColorByHexString(color);
    this.statusBar.styleBlackOpaque();
  }

  public useDefaultStatusBar() {
    if (this.isDarkModeEnabled()) {
      this.useDarkStatusBar();
    } else {
      this.useLightStatusBar();
    }
  }
}
