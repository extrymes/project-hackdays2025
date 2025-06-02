/// <reference types='codeceptjs' />
type steps_file = typeof import('@codeceptjs/configure/test/integration/steps_file.js');
type users = typeof import('@open-xchange/codecept-helper/src/users.js');
type contexts = typeof import('@open-xchange/codecept-helper/src/contexts.js');
type contacts = typeof import('./pageobjects/contacts');
type calendar = typeof import('./pageobjects/calendar');
type mail = typeof import('./pageobjects/mail');
type drive = typeof import('./pageobjects/drive');
type tasks = typeof import('./pageobjects/tasks');
type dialogs = typeof import('./pageobjects/fragments/dialogs');
type autocomplete = typeof import('./pageobjects/fragments/contact-autocomplete');
type contactpicker = typeof import('./pageobjects/fragments/contact-picker');
type mailfilter = typeof import('./pageobjects/fragments/settings-mailfilter');
type search = typeof import('./pageobjects/fragments/search');
type tinymce = typeof import('./pageobjects/fragments/tinymce');
type topbar = typeof import('./pageobjects/fragments/topbar');
type settings = typeof import('./pageobjects/fragments/settings');
type mobileCalendar = typeof import('./pageobjects/mobile/mobileCalendar')
type mobileMail = typeof import('./pageobjects/mobile/mobileMail')
type mobileContacts = typeof import('./pageobjects/mobile/mobileContacts')
type OpenXchange = import('./helper');
type MockRequestHelper = import('@codeceptjs/mock-request');

declare namespace CodeceptJS {
  interface SupportObject { I: I, current: any, users: users, contexts: contexts, contacts: contacts, calendar: calendar, mail: mail, drive: drive, settings: settings, tasks: tasks, dialogs: dialogs, autocomplete: autocomplete, contactpicker: contactpicker, mailfilter: mailfilter, search: search, tinymce: tinymce, topbar: topbar, mobileMail: mobileMail, mobileContacts: mobileContacts, mobileCalendar: mobileCalendar }
  interface Methods extends Puppeteer, OpenXchange, FileSystem, MockRequestHelper {}
  interface I extends ReturnType<steps_file>, WithTranslation<OpenXchange>, WithTranslation<FileSystem>, WithTranslation<MockRequestHelper> {}
  namespace Translation {
    interface Actions {}
  }
}
