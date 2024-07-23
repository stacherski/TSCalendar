Date.prototype.getWeek = function () {
	// Returns the ISO week of the date.
	var date = new Date(this.getTime());
	date.setHours(0, 0, 0, 0);
	// Thursday in current week decides the year.
	date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));
	// January 4 is always in week 1.
	var week1 = new Date(date.getFullYear(), 0, 4);
	// Adjust to Thursday in week 1 and count number of weeks from date to week1.
	return (1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7));
};
class TSCalendar extends HTMLElement {
	constructor() {
		super();
		// VARIABLES
		this.dato = new Date();
		this.currentYear = this.dato.getFullYear();
		this.currentMonth = this.dato.getMonth();
		// Calendar ID
		this.calendarId = this.getAttribute("id") || "mycal";
		// Calendar events
		this.calendarEvents;
		// Calendar events for current month
		this.calendarEventsCurrentMonth;
		/// default options
		this.months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
		this.days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
		this.controls = {
			previousMonth: "Previous",
			today: "Today",
			monthWeekToggle: "This week / this month",
			nextMonth: "Next",
		};
		this.texts = {
			titlePlaceholder: "Event title...",
			descriptionPlaceholder: "Event description...",
			confirmDelete: "You are about to delete event, this is irreversible action",
			confirmEdit: "Do you want to edit event?",
			newEvent: "New event",
			createButton: "Add",
			editButton: "Edit",
			deleteButton: "Delete",
			saveButton: "Save"
		}
		///

		/// Generate months & days options based on the language
		this.language = this.dataset.lang || document.querySelector("html").getAttribute("lang");
		if (this.language)
			this.generateOptions(this.language);

		///
		/// options object passed as data-options within <ts-calendar>
		/// {"months":"Styczeń,Luty,Marzec,Kwiecień,Maj,Czerwiec,Lipiec,Sierpień,Wrzesień,Pażdziernik,Listopad,Grudzień","days":"Pon,Wt,Śr,Czw,Pt,So,Nd","controls":{"previousMonth":"Poprzedni","today":"Dzisiaj","monthWeekToggle":"Ten tydzień","nextMonth":"Następny"}}
		if (this.dataset.options) this.options = JSON.parse(this.dataset.options);

		for (const option in this.options) {
			if (typeof this.options[option] === "object")
				this[option] = this.options[option];
			else
				this[option] = this.options[option].split(",");
		}
		// render calendar structure
		this.innerHTML = `
            <div data-calendar-wrapper>
                <div data-calendar-head>
                    <div data-calendar-title></div>
                    <div data-calendar-controls>
                        <button data-calendar-previous-month>${this.controls.previousMonth}</button>
                        <button data-calendar-today>${this.controls.today}</button>
                        <button data-calendar-month-week-toggle>${this.controls.monthWeekToggle}</button>
                        <button data-calendar-next-month>${this.controls.nextMonth}</button>
                    </div>
                </div>
                <div data-calendar-body>
                    <ul data-calendar-weekdays></ul>
                    <ul data-calendar-days></ul>
                </div>
            </div>
        `;
		// define event Object
		this.calendarEventDetails = {
			id: "",
			date: "",
			year: "",
			month: "",
			day: "",
			title: "",
			description: "",
		};

		// global selectors
		this.currentDate = this.querySelector("[data-calendar-title]");
		this.daysTag = this.querySelector("[data-calendar-days]");
		this.weekdays = this.querySelector("[data-calendar-weekdays]");

		// add functionality to calendar control buttons
		this.btns = this.querySelectorAll("[data-calendar-controls] button").forEach((btn) => {
			btn.addEventListener("click", () => {
				this[`on${Object.entries(btn.dataset).toString().split(",")[0]}`]();
			})
		});

		// render day names
		this.renderDays();
		// render calendar for first time
		this.renderCalendar();
	}

	/// METHODS

	/// Generate calendar month & weekday names based on the language variable
	generateOptions(lang) {
		this.months = [];
		for (let i = 0; i <= 11; i++) {
			this.months.push(new Intl.DateTimeFormat(lang, {
				month: "long"
			}).format(new Date(this.currentYear, i)));
		}
		this.days = [];
		for (let i = 0; i <= 6; i++) {
			this.days.push(new Intl.DateTimeFormat(lang, {
				weekday: "long"
			}).format(new Date(2023, 7, i)));
		}
	}

	fetchCalendarEvents() {
		// fetch calendar events from local storage
		// populate caledar events global variable or set it
		this.calendarEvents = JSON.parse(localStorage.getItem(`tsCalendarEvents-${this.calendarId}`)) || null;

		// find events for current year & month only
		if (this.calendarEvents) {
			this.calendarEventsCurrentMonth = this.calendarEvents.filter((event) => {
				return (
					event.year.includes(this.currentYear) &&
					event.month.includes(this.currentMonth.toString().padStart(2, "0"))
				);
			});
		}
	}

	// render weekdays
	renderDays() {
		for (const day of this.days) this.weekdays.innerHTML += `<li>${day}</li>`;
	}

	// render current month
	renderCalendar() {
		// fetch events
		this.fetchCalendarEvents();

		// set helper variables
		let firstDayOfMonth = new Date(this.currentYear, this.currentMonth, 1).getDay() - 1 === -1 ? 6 : new Date(this.currentYear, this.currentMonth, 1).getDay() - 1;
		let lastDateOfMonth = new Date(this.currentYear, this.currentMonth + 1, 0).getDate();
		let lastDayOfMonth = new Date(this.currentYear, this.currentMonth, lastDateOfMonth).getDay() - 1 == -1 ? 6 : new Date(this.currentYear, this.currentMonth, lastDateOfMonth).getDay() - 1;
		let lastDateOfLastMonth = new Date(this.currentYear, this.currentMonth, 0).getDate();

		// set list items holder variable
		let liTag = "";

		// render first week with days from past month
		for (let i = firstDayOfMonth; i > 0; i--) {
			//check if Monday
			let isMonday = new Date(this.currentYear, this.currentMonth - 1, lastDateOfLastMonth - i + 1).getDay() === 1 ? true : false;
			let weekNumber = new Date(this.currentYear, this.currentMonth - 1, lastDateOfLastMonth - i + 1).getWeek();
			liTag += `<li data-is-monday='${isMonday}' data-week-number='${weekNumber}' class='inactive'><span aria-label='${lastDateOfLastMonth - i + 1}-${this.currentMonth}-${this.currentYear}'>${lastDateOfLastMonth - i + 1}</span></li>`;
		}
		// render all days within current month
		for (let i = 1; i <= lastDateOfMonth; i++) {
			let isToday = i === this.dato.getDate() && this.currentMonth === new Date().getMonth() && this.currentYear === new Date().getFullYear() ? "active" : "";
			let isMonday = new Date(this.currentYear, this.currentMonth, i).getDay() === 1 ? true : false;
			let weekNumber = new Date(this.currentYear, this.currentMonth, i).getWeek();

			// only render events within current month
			// set events holder variable
			let eventData = "";
			// set data attribute value for when day contains any events
			let hasEvent = "";

			if (this.calendarEventsCurrentMonth) {
				// render events for current day
				this.calendarEventsCurrentMonth.forEach((event) => {
					const eventId = event.id;
					const eventDate = event.date;
					const eventName = event.title;
					const eventDescription = event.description;
					const eventDay = Number(event.day);
					const isEventDate = i === eventDay ? true : false;
					if (isEventDate) {
						hasEvent = "has-event";
						eventData += `<div draggable="true" class='event' id='${eventId}'><button aria-label='${eventName}'>${eventName}</button><dialog><article calendar-event-details><h3 aria-live='off' class='heading3'>${eventName}</h6>${eventDescription}<aside><button data-calendar-delete-event>${this.texts.deleteButton}</button><button data-calendar-edit-event>${this.texts.editButton}</button></aside></article></dialog></div>`;
					}
				});
			}
			liTag += `<li data-is-monday='${isMonday}' data-week-number='${weekNumber}' class='${isToday} ${hasEvent}' data-day='${this.currentYear}-${this.currentMonth.toString().padStart(2, "0")}-${i.toString().padStart(2, "0")}'><span aria-label='${i}-${this.currentMonth + 1}-${this.currentYear}'>${i}</span>${eventData}</li>`;
		}
		// render last week by adding days from next month
		for (let i = lastDayOfMonth; i < 6; i++) {
			let weekNumber = new Date(this.currentYear, this.currentMonth, lastDateOfLastMonth).getWeek();
			liTag += `<li class="inactive" data-week-number='${weekNumber}'><span aria-label='${i - lastDayOfMonth + 1}-${this.currentMonth}-${this.currentYear}'>${i - lastDayOfMonth + 1}</span></li>`;
		}
		// set calendar title with current month name (from table at month index) & year values
		this.currentDate.innerText = `${this.months[this.currentMonth]} ${this.currentYear}`;

		// add all rendered elements into calendar
		this.daysTag.innerHTML = liTag;

		// add double click event to LI that fires creating event function
		this.daysTag.querySelectorAll("li").forEach((li) => {
			li.addEventListener("dblclick", (event) => this.addCalendarEvent(event));
			///
			li.addEventListener("dragover", li => {
				if (!li.target.classList.toString().includes('inactive') && li.target.dataset.day) {
					li.target.classList.add('draggedover');
					const date = li.target.dataset.day.split("-");
					// create nice formatted date to be used in the button placeholder title
					const calendarEventDate = new Intl.DateTimeFormat(this.language, {
						month: "long",
						day: "2-digit",
						year: "numeric"
					}).format(new Date(date[0], date[1], date[2]));
					this.calendarEventDetails.date = li.target.dataset.day;
					this.calendarEventDetails.year = date[0];
					this.calendarEventDetails.month = date[1];
					this.calendarEventDetails.day = date[2];

				}
			})
			li.addEventListener("dragleave", li => {
				li.target.classList.remove('draggedover');
			})
		});
		// add dialog open/close functionality to event buttons
		// for all events within current month
		this.daysTag.querySelectorAll(".event").forEach((event) => {
			// for all event buttons
			event.querySelector("button").addEventListener("click", (btn) => {
				// close all opened dialogs first except current clicked event button
				this.querySelectorAll(`.event:not([id='${event.id}']) dialog`).forEach(dialog => dialog.removeAttribute("open"));
				// open or close dialog
				btn.target.nextElementSibling.toggleAttribute("open");
				// if there's opened dialog with event template remove it from DOM
				if (document.querySelector(".event.template"))
					document.querySelector(".event.template").remove();
			});

			event.addEventListener("dragstart", btn => {
				// pass event ID to global object
				this.calendarEventDetails.id = btn.target.id;
				// close dialog before moving event around
				btn.target.querySelector('dialog').removeAttribute('open');
				// hide element at starting point
				btn.target.style.opacity = '.5';
			})
			event.addEventListener("dragend", event => {

				let calendarEventsData = JSON.parse(localStorage.getItem(`tsCalendarEvents-${this.calendarId}`));
				// find index of the object with matching event ID
				const calendarEventsToEdit = calendarEventsData.filter((event) => {
					return (event.id.includes(this.calendarEventDetails.id));
				})
				let index;
				if (calendarEventsData) {
					index = calendarEventsData.map((event) => {
						return event.id;
					}).indexOf(this.calendarEventDetails.id);
				}
				this.calendarEventDetails.id = calendarEventsToEdit[0].id;
				this.calendarEventDetails.title = calendarEventsToEdit[0].title;
				this.calendarEventDetails.description = calendarEventsToEdit[0].description;
				console.log(this.calendarEventDetails)
				// remove object @ index from array 
				calendarEventsData.splice(index, 1);
				// save events to localStorage
				localStorage.setItem(`tsCalendarEvents-${this.calendarId}`, JSON.stringify(calendarEventsData));
				this.saveCalendarEvent(this.calendarEventDetails);
			})

		});

		// delete button
		this.querySelectorAll("[data-calendar-delete-event]", this.daysTag).forEach(
			(event) =>
			event.addEventListener("click", (event) => {
				if (window.confirm(`${this.texts.confirmDelete}`))
					this.deleteCalendarEvent(event.target.closest(".event").id);
			})
		);

		// edit button
		this.querySelectorAll("[data-calendar-edit-event]", this.daysTag).forEach(
			(event) =>
			event.addEventListener("click", (event) => {
				this.editCalendarEvent(event.target.closest(".event").id);
			})
		);

		//click anywhere outside button or dialog to close open dialog
		this.addEventListener("click", (event) => {
			if (event.target.matches(":not(.event button, .event dialog, .event dialog *)")) {
				this.querySelectorAll(`.event:not(.template) dialog`).forEach(
					(dialog) => dialog.removeAttribute("open", true)
				);
				this.querySelectorAll(`.event[is-edited] dialog`).forEach(
					(dialog) => {
						dialog.closest('.event').removeAttribute('is-edited');
						dialog.removeAttribute("open", true)
						const eventDetails = dialog.querySelector('article[calendar-event-details]');
						eventDetails.style.display = 'block';
						const editingForm = dialog.querySelector('article[calendar-event-edit-form]')
						editingForm.remove();
					}
				);
			}
		});
	}

	addCalendarEvent(event) {
		// remove open template
		if (document.querySelector(".event.template"))
			document.querySelector(".event.template").remove();
		// get the date from calendar day data attribute
		const date = event.target.dataset.day.split("-");
		// create nice formatted date to be used in the button placeholder title
		const calendarEventDate = new Intl.DateTimeFormat(this.language, {
			month: "long",
			day: "2-digit",
			year: "numeric"
		}).format(new Date(date[0], date[1], date[2]));
		// set placeholder/default title
		const calendarEventDefaultTitle = `New event @ ${calendarEventDate}`;
		// create event wrapper div
		const calendarEvent = document.createElement("div");
		// add necesary classes
		calendarEvent.classList.add("event", "template");
		// create event button within event wrapper
		const calendarEventButton = document.createElement("button");
		// set button text to defatult title
		calendarEventButton.textContent = calendarEventDefaultTitle;
		// add button to event wrapper div
		calendarEvent.appendChild(calendarEventButton);
		// create dialog to hold form
		const dialog = document.createElement("dialog");
		// make it open
		dialog.toggleAttribute("open");
		// create dialog content
		const dialogContent = document.createElement("article");
		// create form
		dialogContent.innerHTML = `
        <form class="form">
            <div>
                <label for="eventTitle">Event</label>
                <input type="text" name="eventTitle" placeholder="${this.texts.titlePlaceholder}"></input>
            </div>
            <div>
                <label for="eventDescription">Description</label>
                <textarea name="eventDescription" placeholder="${this.texts.descriptionPlaceholder}"></textarea>
            </div>
            <input type="submit" value="${this.texts.createButton}"></input>
        </form>
        `;
		// add content to dialog
		dialog.appendChild(dialogContent);
		// add dialog to event wrapper div
		calendarEvent.appendChild(dialog);
		// add event to calendar day
		event.target.appendChild(calendarEvent);

		// populate object to hold all event details
		this.calendarEventDetails = {
			id: crypto.randomUUID(),
			date: event.target.dataset.day,
			year: date[0],
			month: date[1],
			day: date[2],
			title: calendarEventDefaultTitle,
			description: "",
		};

		// create proxy eventHandler object
		// it will update event title in real time based on the changes made to object holding event's data
		const eventHandler = {
			set(object, property, value) {
				object[property] = value;
				value == "" ? (object[property] = calendarEventDefaultTitle) : (object[property] = value);
				//set action to update event button text with event title 
				property == "title" ? (calendarEventButton.textContent = value) : null;
				return true;
			},
		};

		// create Proxy to synchronise calendarEventDetails object with DOM using methods from eventHandler object
		const calendarEventDetailsProxy = new Proxy(this.calendarEventDetails, eventHandler);

		// local selectors for form field
		const calendarEventTitle = this.querySelector('input[name="eventTitle"]');
		const calendarEventDescription = this.querySelector('textarea[name="eventDescription"]');

		// listen to changes made within event create form and update calendarEventDetails object through Proxy
		calendarEventTitle.addEventListener("input", (event) => {
			event.target.value === "" ? (calendarEventDetailsProxy.title = calendarEventDefaultTitle) : (calendarEventDetailsProxy.title = event.target.value);
		});
		calendarEventDescription.addEventListener("input", (event) => {
			calendarEventDetailsProxy.description = event.target.value;
		});

		// save event button selector
		const saveButton = document.querySelector('.template input[type="submit"]');
		saveButton.addEventListener("click", (event) => {
			event.preventDefault();
			this.saveCalendarEvent(this.calendarEventDetails);
		});
	}

	// create event method
	saveCalendarEvent(calendarEventDetails) {
		// remove event template from DOM
		if (document.querySelector(".event.template"))
			document.querySelector(".event.template").remove();
		// fetch events from local storage or create empty array
		let calendarEventsData = JSON.parse(localStorage.getItem(`tsCalendarEvents-${this.calendarId}`)) || [];
		// push new event into array
		calendarEventsData.push(calendarEventDetails);
		// save events array to local storage
		localStorage.setItem(`tsCalendarEvents-${this.calendarId}`, JSON.stringify(calendarEventsData));
		this.renderCalendar();
	}

	// delete event method
	deleteCalendarEvent(id) {
		// fetch calendar data from localStorage
		let calendarEventsData = JSON.parse(localStorage.getItem(`tsCalendarEvents-${this.calendarId}`));
		// find index of the object with matching event ID
		if (calendarEventsData) {
			let index = calendarEventsData.map((event) => {
				return event.id;
			}).indexOf(id);
			// remove object @ index from array 
			calendarEventsData.splice(index, 1);
			// save events to localStorage
			localStorage.setItem(`tsCalendarEvents-${this.calendarId}`, JSON.stringify(calendarEventsData));
			// render calendar after deleting event
			this.renderCalendar();
		}
	}

	// edit event method
	editCalendarEvent(id) {

		// fetch calendar data from localStorage
		let calendarEventsData = JSON.parse(localStorage.getItem(`tsCalendarEvents-${this.calendarId}`));
		// find index of the object with matching event ID
		const calendarEventsToEdit = calendarEventsData.filter((event) => {
			return (event.id.includes(id));
		})
		let index;
		if (calendarEventsData) {
			index = calendarEventsData.map((event) => {
				return event.id;
			}).indexOf(id);
		}
		// create calendar event
		let calendarEvent = document.querySelector(`.event[id="${id}"]`);
		calendarEvent.toggleAttribute('is-edited');
		let dialog = calendarEvent.querySelector(`dialog`);
		// create form
		const dialogContent = document.createElement("article");
		dialogContent.toggleAttribute("calendar-event-edit-form")
		this.calendarEventDetails = calendarEventsToEdit[0];
		dialogContent.innerHTML = `
        <form class="form">
            <div>
                <label for="eventTitle">Event</label>
                <input type="text" name="eventTitle" placeholder="${this.texts.titlePlaceholder}" value="${this.calendarEventDetails.title}"></input>
            </div>
            <div>
                <label for="eventDescription">Description</label>
                <textarea name="eventDescription" placeholder="${this.texts.descriptionPlaceholder}">${this.calendarEventDetails.description}</textarea>
            </div>
            <input type="submit" value="${this.texts.saveButton}" calendar-event-save-button></input>
        </form>
        `;
		const eventDetails = dialog.querySelector('article:first-child')
		eventDetails.style.display = 'none';

		dialog.appendChild(dialogContent);
		dialog.setAttribute("open", true);
		const saveButton = dialog.querySelector('[calendar-event-save-button]');
		console.log(saveButton)
		saveButton.addEventListener("click", (event) => {
			event.preventDefault();
			// remove object @ index from array 
			calendarEventsData.splice(index, 1);
			// save events to localStorage
			localStorage.setItem(`tsCalendarEvents-${this.calendarId}`, JSON.stringify(calendarEventsData));
			this.calendarEventDetails.title = dialog.querySelector('input[name="eventTitle"]').value;
			this.calendarEventDetails.description = dialog.querySelector('textarea[name="eventDescription"]').value;
			this.saveCalendarEvent(this.calendarEventDetails);
		});
	}


	oncalendarPreviousMonth() {
		this.currentMonth = this.currentMonth - 1;
		this.dato = new Date();
		if (this.currentMonth < 0) {
			this.dato = new Date(
				this.currentYear,
				this.currentMonth,
				new Date().getDate()
			);
			this.currentYear = this.dato.getFullYear();
			this.currentMonth = this.dato.getMonth();
		}
		this.renderCalendar();
	}

	oncalendarNextMonth() {
		this.currentMonth = this.currentMonth + 1;
		this.dato = new Date();
		if (this.currentMonth > 11) {
			this.dato = new Date(
				this.currentYear,
				this.currentMonth,
				new Date().getDate()
			);
			this.currentYear = this.dato.getFullYear();
			this.currentMonth = this.dato.getMonth();
		}
		this.renderCalendar();
	}

	oncalendarMonthWeekToggle() {
		// TBD
		console.log("week/month");
	}

	oncalendarToday() {
		this.dato = new Date();
		this.currentYear = this.dato.getFullYear();
		this.currentMonth = this.dato.getMonth();
		this.renderCalendar();
	}
}
// register new custom element
window.customElements.define("ts-calendar", TSCalendar);