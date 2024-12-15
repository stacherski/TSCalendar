*TSCalendar* is an attempt to create calendar web component with no ShadowDOM, few customising options and utilising localStorage

Default settings are for English, but cna ge customised with options object passed in data-options attribute.

Basic usage is:

<ts-calendar></ts-calendar>

ID attribute is added automatically unless explicitly specified for the custom element
If your document has specified language attribute within HTML element then your language setting is used. You can also specify calendar language by adding data-lang attribute ac specifying short language code there, e.g. "en", "pl", "de", "dk" etc.

You can add custom button labels with data-options attribute.

<ts-calendar
        id="tscal" 
        data-lang="en"
        data-options='{"controls":{"previousMonth":"Prev","today":"Today","monthWeekToggle":"Month/Week","nextMonth":"Next"}}'
></ts-calendar>

