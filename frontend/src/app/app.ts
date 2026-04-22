import { CommonModule, isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpErrorResponse, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

type MessageState = '' | 'success' | 'error';

interface BookLocation {
  floor: string;
  section: string;
  shelf: string;
}

interface Book {
  id: number;
  title: string;
  author: string;
  isbn: string;
  category: string;
  status: 'available' | 'checked-out';
  location: BookLocation;
}

interface BooksResponse {
  total: number;
  query: string;
  category: string;
  books: Book[];
}

interface LoginResponse {
  token: string;
  tokenType: string;
  expiresIn: number;
}

interface AuthTokenPayload {
  sub?: string;
  exp?: number;
}

interface AdminSummary {
  id: number;
  username: string;
  createdAt: string;
  updatedAt: string;
}

interface CreateBookPayload {
  title: string;
  author: string;
  isbn: string;
  category: string;
  floor: string;
  section: string;
  shelf: string;
  status: 'available' | 'checked-out';
}

interface CsvImportRowError {
  row: number;
  errors: string[];
}

interface CsvImportErrorDetails {
  totalRows?: number;
  invalidRows?: number;
  errors?: CsvImportRowError[];
}

interface CsvImportResponse {
  insertedCount: number;
  totalRows: number;
}

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);

  private static readonly API_BASE = '/api';
  private static readonly ADMIN_TOKEN_STORAGE_KEY = 'find-your-book-admin-token';

  protected readonly title = signal('Find Your Book');
  protected readonly books = signal<Book[]>([]);
  protected readonly categories = signal<string[]>([]);
  protected readonly resultsMeta = signal('Loading catalog...');

  protected readonly isLoading = signal(false);
  protected readonly adminPanelVisible = signal(false);
  protected readonly isAdminLoggedIn = signal(false);
  protected readonly adminUsers = signal<AdminSummary[]>([]);

  protected readonly adminAuthMessage = signal('');
  protected readonly adminAuthState = signal<MessageState>('');
  protected readonly addBookMessage = signal('Admin login required to add a book.');
  protected readonly addBookState = signal<MessageState>('');
  protected readonly passwordChangeMessage = signal('');
  protected readonly passwordChangeState = signal<MessageState>('');
  protected readonly csvUploadMessage = signal('Admin login required to upload CSV files.');
  protected readonly csvUploadState = signal<MessageState>('');
  protected readonly isUploadingCsv = signal(false);

  protected searchQuery = '';
  protected selectedCategory = '';

  protected activeAdminUsername = '';
  protected adminUsername = '';
  protected adminPassword = '';
  protected currentPassword = '';
  protected nextPassword = '';
  protected confirmNextPassword = '';
  protected selectedCsvFileName = '';

  protected readonly newBook: CreateBookPayload = {
    title: '',
    author: '',
    isbn: '',
    category: '',
    floor: '',
    section: '',
    shelf: '',
    status: 'available'
  };

  private adminToken = '';
  private tokenExpiryTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private selectedCsvFile: File | null = null;

  async ngOnInit(): Promise<void> {
    this.restoreSession();
    await this.initializeCatalog();
  }

  protected toggleAdminPanel(): void {
    this.adminPanelVisible.update((state) => !state);
  }

  protected closeAdminPanel(): void {
    this.adminPanelVisible.set(false);
  }

  protected async onSearchSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await this.refreshCatalog();
  }

  protected async onCategoryChange(): Promise<void> {
    await this.refreshCatalog();
  }

  protected async onLoginSubmit(event: Event): Promise<void> {
    event.preventDefault();

    this.adminAuthMessage.set('Signing in...');
    this.adminAuthState.set('');

    try {
      await this.loginAdmin(this.adminUsername.trim(), this.adminPassword);
      this.adminUsername = '';
      this.adminPassword = '';

      this.adminAuthMessage.set('Signed in as admin.');
      this.adminAuthState.set('success');
      this.isAdminLoggedIn.set(true);
      this.addBookMessage.set('');
      this.addBookState.set('');
      this.passwordChangeMessage.set('');
      this.passwordChangeState.set('');
      this.csvUploadMessage.set('');
      this.csvUploadState.set('');

      await this.loadAdmins();
    } catch (error) {
      this.adminAuthMessage.set(this.getErrorMessage(error, 'Admin login failed.'));
      this.adminAuthState.set('error');
      this.isAdminLoggedIn.set(false);
      this.adminToken = '';
      this.activeAdminUsername = '';
      this.adminUsers.set([]);
      this.addBookMessage.set('Admin login required to add a book.');
      this.addBookState.set('');
      this.passwordChangeMessage.set('');
      this.passwordChangeState.set('');
      this.csvUploadMessage.set('Admin login required to upload CSV files.');
      this.csvUploadState.set('');
    }
  }

  protected onLogout(): void {
    this.clearSession();
    this.adminUsername = '';
    this.adminPassword = '';
    this.currentPassword = '';
    this.nextPassword = '';
    this.confirmNextPassword = '';
    this.activeAdminUsername = '';
    this.adminUsers.set([]);

    this.adminAuthMessage.set('Logged out.');
    this.adminAuthState.set('');
    this.addBookMessage.set('Admin login required to add a book.');
    this.addBookState.set('');
    this.passwordChangeMessage.set('');
    this.passwordChangeState.set('');
    this.csvUploadMessage.set('Admin login required to upload CSV files.');
    this.csvUploadState.set('');
    this.selectedCsvFile = null;
    this.selectedCsvFileName = '';
  }

  protected async onChangePasswordSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.nextPassword !== this.confirmNextPassword) {
      this.passwordChangeState.set('error');
      this.passwordChangeMessage.set('New password and confirm password do not match.');
      return;
    }

    this.passwordChangeState.set('');
    this.passwordChangeMessage.set('Updating password...');

    try {
      await this.changePassword(this.currentPassword, this.nextPassword);

      this.currentPassword = '';
      this.nextPassword = '';
      this.confirmNextPassword = '';
      this.passwordChangeState.set('success');
      this.passwordChangeMessage.set('Password changed successfully.');
    } catch (error) {
      this.passwordChangeState.set('error');
      this.passwordChangeMessage.set(this.getErrorMessage(error, 'Failed to change password.'));
    }
  }

  protected async onAddBookSubmit(event: Event): Promise<void> {
    event.preventDefault();

    this.addBookMessage.set('Saving book...');
    this.addBookState.set('');

    try {
      const payload = this.toCreateBookPayload(this.newBook);

      await this.createBook(payload);
      this.resetNewBookForm();
      await this.loadCategories();
      await this.refreshCatalog();

      this.addBookMessage.set('Book added successfully.');
      this.addBookState.set('success');
    } catch (error) {
      this.addBookMessage.set(this.getErrorMessage(error, 'Failed to add book.'));
      this.addBookState.set('error');
    }
  }

  protected onCsvFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.item(0) ?? null;

    this.selectedCsvFile = file;
    this.selectedCsvFileName = file?.name || '';
    this.csvUploadState.set('');

    if (file) {
      this.csvUploadMessage.set(`Selected file: ${file.name}`);
    } else if (this.isAdminLoggedIn()) {
      this.csvUploadMessage.set('Select a CSV file to upload.');
    } else {
      this.csvUploadMessage.set('Admin login required to upload CSV files.');
    }
  }

  protected async onCsvUploadSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (!this.selectedCsvFile) {
      this.csvUploadState.set('error');
      this.csvUploadMessage.set('Choose a CSV file before uploading.');
      return;
    }

    this.isUploadingCsv.set(true);
    this.csvUploadState.set('');
    this.csvUploadMessage.set('Uploading CSV and importing books...');

    try {
      const result = await this.importBooksCsv(this.selectedCsvFile);
      await this.loadCategories();
      await this.refreshCatalog();

      this.csvUploadState.set('success');
      this.csvUploadMessage.set(`Imported ${result.insertedCount} of ${result.totalRows} row(s).`);
      this.selectedCsvFile = null;
      this.selectedCsvFileName = '';
    } catch (error) {
      this.csvUploadState.set('error');
      this.csvUploadMessage.set(this.formatCsvImportError(error));
    } finally {
      this.isUploadingCsv.set(false);
    }
  }

  private restoreSession(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const token = localStorage.getItem(App.ADMIN_TOKEN_STORAGE_KEY) ?? '';

    if (!token) {
      this.clearSession();
      return;
    }

    if (this.isTokenExpired(token)) {
      this.markSessionExpired();
      return;
    }

    this.adminToken = token;
    this.isAdminLoggedIn.set(true);
    const payload = this.decodeTokenPayload(token);
    this.activeAdminUsername = payload?.sub || '';
    this.scheduleTokenExpiryCheck(token);

    if (token) {
      this.addBookMessage.set('');
      this.addBookState.set('');
      this.passwordChangeMessage.set('');
      this.passwordChangeState.set('');
      this.csvUploadMessage.set('');
      this.csvUploadState.set('');

      void this.loadAdmins();
    }
  }

  private async initializeCatalog(): Promise<void> {
    try {
      await this.loadCategories();
      await this.refreshCatalog();
    } catch (_error) {
      this.books.set([]);
      this.resultsMeta.set('Could not connect to backend. Start backend on http://localhost:4000.');
    }
  }

  private async loadCategories(): Promise<void> {
    const response = await firstValueFrom(this.http.get<string[]>(`${App.API_BASE}/categories`));
    this.categories.set(response);
  }

  private async refreshCatalog(): Promise<void> {
    this.isLoading.set(true);

    try {
      const payload = await this.fetchBooks(this.searchQuery, this.selectedCategory);
      this.books.set(payload.books);

      const query = this.searchQuery.trim();
      const category = this.selectedCategory.trim();

      if (!query && !category) {
        this.resultsMeta.set(`Showing full catalog: ${payload.total} books.`);
        return;
      }

      const details: string[] = [];
      if (query) {
        details.push(`query "${query}"`);
      }
      if (category) {
        details.push(`category "${category}"`);
      }

      if (payload.total > 0) {
        this.resultsMeta.set(
          `Found ${payload.total} result${payload.total === 1 ? '' : 's'} for ${details.join(' and ')}.`
        );
      } else {
        this.resultsMeta.set(`No matching books for ${details.join(' and ')}.`);
      }
    } catch (error) {
      this.books.set([]);
      this.resultsMeta.set(this.getErrorMessage(error, 'Failed to fetch books.'));
    } finally {
      this.isLoading.set(false);
    }
  }

  private async fetchBooks(query: string, category: string): Promise<BooksResponse> {
    let params = new HttpParams();

    if (query.trim()) {
      params = params.set('query', query.trim());
    }

    if (category.trim()) {
      params = params.set('category', category.trim());
    }

    return firstValueFrom(
      this.http.get<BooksResponse>(`${App.API_BASE}/books`, {
        params
      })
    );
  }

  private async loginAdmin(username: string, password: string): Promise<void> {
    const payload = await firstValueFrom(
      this.http.post<LoginResponse>(`${App.API_BASE}/auth/login-admin`, {
        username,
        password
      })
    );

    this.adminToken = payload.token;
    const tokenPayload = this.decodeTokenPayload(payload.token);
    this.activeAdminUsername = tokenPayload?.sub || username;

    if (isPlatformBrowser(this.platformId)) {
      localStorage.setItem(App.ADMIN_TOKEN_STORAGE_KEY, payload.token);
    }

    this.scheduleTokenExpiryCheck(payload.token);
  }

  private async loadAdmins(): Promise<void> {
    if (!this.adminToken) {
      return;
    }

    const headers = this.createAuthHeaders();

    try {
      const admins = await firstValueFrom(
        this.http.get<AdminSummary[]>(`${App.API_BASE}/auth/admins`, {
          headers
        })
      );

      this.adminUsers.set(admins);
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.markSessionExpired();
      }
    }
  }

  private async changePassword(oldPassword: string, newPassword: string): Promise<void> {
    if (!this.adminToken) {
      throw new Error('Admin login required to change password.');
    }

    const headers = this.createAuthHeaders();

    try {
      await firstValueFrom(
        this.http.post<{ message: string }>(
          `${App.API_BASE}/auth/change-password`,
          {
            oldPassword,
            newPassword
          },
          { headers }
        )
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.markSessionExpired();
        throw new Error('Session expired. Please sign in again.');
      }

      throw error;
    }
  }

  private async createBook(payload: CreateBookPayload): Promise<void> {
    if (!this.adminToken) {
      throw new Error('Admin login required to add a book.');
    }

    const headers = this.createAuthHeaders();
    const createPayload = this.toCreateBookPayload(payload);

    try {
      await firstValueFrom(
        this.http.post<Book>(`${App.API_BASE}/books`, createPayload, {
          headers
        })
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.markSessionExpired();
        throw new Error('Session expired. Please sign in again.');
      }

      throw error;
    }
  }

  private async importBooksCsv(file: File): Promise<CsvImportResponse> {
    if (!this.adminToken) {
      throw new Error('Admin login required to upload CSV files.');
    }

    const headers = this.createAuthHeaders();

    const formData = new FormData();
    formData.append('file', file);

    try {
      return await firstValueFrom(
        this.http.post<CsvImportResponse>(`${App.API_BASE}/books/import/csv`, formData, {
          headers
        })
      );
    } catch (error) {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        this.markSessionExpired();
        throw new Error('Session expired. Please sign in again.');
      }

      throw error;
    }
  }

  private resetNewBookForm(): void {
    this.newBook.title = '';
    this.newBook.author = '';
    this.newBook.isbn = '';
    this.newBook.category = '';
    this.newBook.floor = '';
    this.newBook.section = '';
    this.newBook.shelf = '';
    this.newBook.status = 'available';
  }

  private toCreateBookPayload(source: CreateBookPayload): CreateBookPayload {
    return {
      title: source.title.trim(),
      author: source.author.trim(),
      isbn: source.isbn.trim(),
      category: source.category.trim(),
      floor: source.floor.trim(),
      section: source.section.trim(),
      shelf: source.shelf.trim(),
      status: source.status
    };
  }

  private getErrorMessage(error: unknown, fallback: string): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.error;
      if (typeof message === 'string' && message.trim()) {
        return message;
      }

      if (typeof error.message === 'string' && error.message.trim()) {
        return error.message;
      }

      return fallback;
    }

    if (error instanceof Error && error.message.trim()) {
      return error.message;
    }

    return fallback;
  }

  private formatCsvImportError(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const details = error.error?.details as CsvImportErrorDetails | undefined;
      const rowErrors = Array.isArray(details?.errors) ? details.errors : [];

      if (rowErrors.length > 0) {
        const sample = rowErrors
          .slice(0, 3)
          .map((rowError) => `Row ${rowError.row}: ${rowError.errors.join(', ')}`)
          .join(' | ');

        const moreCount = rowErrors.length > 3 ? ` (+${rowErrors.length - 3} more)` : '';
        return `CSV validation failed. ${sample}${moreCount}`;
      }

      return this.getErrorMessage(error, 'CSV upload failed.');
    }

    return this.getErrorMessage(error, 'CSV upload failed.');
  }

  private clearSession(): void {
    this.adminToken = '';
    this.isAdminLoggedIn.set(false);
    this.activeAdminUsername = '';
    this.adminUsers.set([]);

    if (this.tokenExpiryTimeoutId) {
      clearTimeout(this.tokenExpiryTimeoutId);
      this.tokenExpiryTimeoutId = null;
    }

    if (isPlatformBrowser(this.platformId)) {
      localStorage.removeItem(App.ADMIN_TOKEN_STORAGE_KEY);
    }
  }

  private markSessionExpired(): void {
    this.clearSession();
    this.adminAuthMessage.set('Session expired. Please sign in again.');
    this.adminAuthState.set('error');
    this.addBookMessage.set('Session expired. Please sign in again.');
    this.addBookState.set('error');
    this.passwordChangeMessage.set('Session expired. Please sign in again.');
    this.passwordChangeState.set('error');
    this.csvUploadMessage.set('Session expired. Please sign in again.');
    this.csvUploadState.set('error');
    this.selectedCsvFile = null;
    this.selectedCsvFileName = '';
  }

  private isTokenExpired(token: string): boolean {
    const payload = this.decodeTokenPayload(token);
    if (!payload || typeof payload.exp !== 'number') {
      return true;
    }

    const now = Math.floor(Date.now() / 1000);
    return now >= payload.exp;
  }

  private decodeTokenPayload(token: string): AuthTokenPayload | null {
    const [encodedPayload] = token.split('.');
    if (!encodedPayload) {
      return null;
    }

    try {
      const base64 = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
      const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=');
      const decoded = atob(padded);
      return JSON.parse(decoded) as AuthTokenPayload;
    } catch (_error) {
      return null;
    }
  }

  private scheduleTokenExpiryCheck(token: string): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }

    const payload = this.decodeTokenPayload(token);
    if (!payload || typeof payload.exp !== 'number') {
      this.markSessionExpired();
      return;
    }

    const expiresAtMs = payload.exp * 1000;
    const delayMs = expiresAtMs - Date.now();

    if (this.tokenExpiryTimeoutId) {
      clearTimeout(this.tokenExpiryTimeoutId);
      this.tokenExpiryTimeoutId = null;
    }

    if (delayMs <= 0) {
      this.markSessionExpired();
      return;
    }

    this.tokenExpiryTimeoutId = setTimeout(() => {
      this.markSessionExpired();
    }, delayMs);
  }

  private createAuthHeaders(): HttpHeaders {
    return new HttpHeaders({
      Authorization: `Bearer ${this.adminToken}`
    });
  }
}
