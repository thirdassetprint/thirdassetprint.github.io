// Global variables
let allFieldsRequired = true;
let isWidgetValid = false;
let globalElements;
let globalFieldsToUse;

document.addEventListener("DOMContentLoaded", function () {

	function getFieldValue(fieldId) {
		return new Promise((resolve) => {
			JFCustomWidget.getFieldsValueById(fieldId, (response) => {
				resolve(response.value);
			});
		});
	}
	
	async function initializeWidget(data) {
		console.log("Initializing widget with data:", data);
	
		const $widgetContainer = $("#widgetContainer");
		const elements = initializeElements($widgetContainer);
		if (!elements) {
			console.error("Failed to initialize elements for container", $widgetContainer);
			return;
		}
	
		globalElements = elements; // Set the global elements
	
		const config = configureWidget(elements);
		if (!config) {
			console.error("Failed to configure widget for elements", elements);
			return;
		}
	
		globalFieldsToUse = config.fieldsToUse; // Set the global fieldsToUse
	
		// Fetch first name, middle initial, last name, and suffix
		const firstName = await getFieldValue("q31_FormFillerName[first]");
		const middleInitial = await getFieldValue("q31_FormFillerName[middle]");
		const lastName = await getFieldValue("q31_FormFillerName[last]");
		const suffix = await getFieldValue("q31_FormFillerName[suffix]");

		// Add console log here
		console.log("Name values:", { firstName, middleInitial, lastName, suffix });

	
		// Construct the full name
		let fullName = `${firstName || ''} ${middleInitial || ''} ${lastName || ''}`.trim();
		if (suffix) {
			fullName += `, ${suffix}`;
		}
	
		// Modify the config or elements as needed with the fetched values
		if (fullName) {
			config.defaultAccountName = `${fullName}'s Account`;
		}

		console.log("Constructed names:", { fullName, defaultAccountName: config.defaultAccountName });
	
		setupWidget($widgetContainer, elements, config, data);
	
		// Add event listener for the new checkbox
		$(elements.dataContainer).on('change', 'input[name^="sameAsName"]', function() {
			const row = $(this).closest('.row');
			const titleInput = row.find('input[name^="title"]');
			if (this.checked) {
				titleInput.val(config.defaultAccountName).prop('disabled', true);
			} else {
				titleInput.prop('disabled', false);
			}
		});
	}

	// Call this function when the widget is ready
	JFCustomWidget.subscribe("ready", function (data) {
		console.log("JFCustomWidget is ready with data:", data);
		initializeWidget(data);
	});

	function setupWidget(container, elements, config, data) {
		// Clean up previous event handlers to prevent multiple bindings
		elements.addButton.off("click").click(function () {
			addRow(elements, config.fieldsToUse, config.accountLabel);
		});

		elements.removeButton.off("click").click(function () {
			removeRow(elements, config.fieldsToUse, config.accountLabel);
		});

		// Check if we have saved data
		if (data && data.value) {
			console.log("Populating widget with saved data:", data.value);
			populateWidgetFromSavedData(data.value, elements, config);
		} else {
			// Initial row setup if no saved data
			addInitialRow(elements, config.fieldsToUse, config.accountLabel);
		}

		// Handle changes and validation
		$(elements.dataContainer)
			.off("change")
			.on("change", "input, select", function () {
				const validationResult = validateLastRow(elements, config.fieldsToUse, true);
				console.log("Revalidating on change event:", validationResult);
				JFCustomWidget.sendData(validationResult);
			});
	}

	function populateWidgetFromSavedData(savedData, elements, config) {
		try {
			const parsedData = typeof savedData === "string" ? JSON.parse(savedData) : savedData;
			if (parsedData && parsedData.accounts) {
				elements.dataContainer.empty(); // Clear existing rows

				parsedData.accounts.forEach((account, index) => {
					const rowDiv = createRowContent(config.fieldsToUse, account.accountType, elements);
					elements.dataContainer.append(rowDiv);

					// Populate the fields
					Object.keys(account).forEach((key) => {
						const field = rowDiv.querySelector(`[name^="${key}"]`);
						if (field) {
							if (field.type === "radio") {
								const radio = rowDiv.querySelector(`[name^="${key}"][value="${account[key]}"]`);
								if (radio) radio.checked = true;
							} else if (field.tagName === "SELECT") {
								field.value = account[key];
								$(field).trigger("change"); // Trigger change event for any dependent fields
							} else {
								field.value = account[key];
							}
						}
					});

					// Update visibility of fields based on populated data
					updateBeneficiaryVisibility(rowDiv, account.registration);
					toggleOtherRegistration(rowDiv, account.registration === "Other");
				});

				setActionButtonText(elements, config.fieldsToUse);
				updateIframeHeight(elements);
			}
		} catch (error) {
			console.error("Error parsing saved data:", error);
		}
	}
});

function initializeElements(container) {
	const elements = {
		dataContainer: container.find("#dataContainer"),
		widgetContainer: container,
		errorMessageContainer: container.find("#errorMessage"),
		addButton: container.find(".addRow"),
		removeButton: container.find(".removeRow"),
	};

	// Log each element to ensure they are found
	// console.log("Initializing elements:", elements);
	Object.keys(elements).forEach((key) => {
		if (elements[key].length === 0) {
			console.error(`Initialization failed: ${key} not found in container`, container);
		}
	});

	return elements;
}

function configureWidget(elements) {
	const accountLabel = JFCustomWidget.getWidgetSetting("accountLabel");
	if (!accountLabel) {
		console.error("Account Label is not set");
		return null;
	}

	const fieldsToUse = getFieldsToUse(accountLabel);
	if (!fieldsToUse) {
		console.error("No fields configuration found for the given account label.");
		return null;
	}
	return { accountLabel, fieldsToUse };
}

function attachEventListeners(elements, fieldsToUse, accountLabel) {
	elements.addButton.addEventListener("click", () => addRow(elements, fieldsToUse, accountLabel));
	elements.removeButton.addEventListener("click", () => removeRow(elements, fieldsToUse, accountLabel));
}

function addInitialRow(elements, fieldsToUse, accountLabel) {
	const rowDiv = createRowContent(fieldsToUse, accountLabel, elements);

	// Use jQuery's append method instead of appendChild
	elements.dataContainer.append(rowDiv);

	$(".datepicker").datepicker({
		dateFormat: "yy-mm-dd",
	});
	setActionButtonText(elements, fieldsToUse, accountLabel);
	updateIframeHeight(elements);

	// Set initial validation state
	const validationResult = validateLastRow(elements, fieldsToUse, false);
	// console.log("Initial validation result:", validationResult);
	JFCustomWidget.sendData(validationResult);
}

// Determine which fields to use based on the accountLabel
function getFieldsToUse(accountLabel) {
	const { widgetSettingsMapping } = window;
	return widgetSettingsMapping[accountLabel.toLowerCase()] || widgetSettingsMapping["account"];
}

function handleRadioChange(radio, rowDiv, elements, fieldsToUse) {
	const isVisible = radio.value === "Yes";
	const fields = ["beneficiaryName", "beneficiaryPhoneNumber"].map((name) => rowDiv.querySelector(`input[name='${name}']`));

	fields.forEach((field) => {
		if (field) {
			field.classList.toggle("hidden", !isVisible);
			field.classList.toggle("visible", isVisible);
			field.required = isVisible && allFieldsRequired;
		}
	});

	const accountLabel = JFCustomWidget.getWidgetSetting("accountLabel");
	const registrationType = rowDiv.querySelector('select[name="registration"]').value;
	const bypassProbate = getBypassProbate(accountLabel, registrationType, isVisible);
	console.log(`BeneficiaryYN changed - bypassProbate: ${bypassProbate}`);

	updateIframeHeight(elements);
	isWidgetValid = validateLastRow(elements, fieldsToUse);
	JFCustomWidget.sendData({ valid: isWidgetValid });
}

function validateLastRow(elements, fieldsToUse, showErrors = true, triggerUIEffects = false) {
	const { dataContainer, errorMessageContainer } = elements;
	const lastRow = dataContainer.children().last();
	let isValid = true;
	let rowData = {};

	if (lastRow.length && allFieldsRequired) {
		const visibleFields = lastRow.find("input:not(.hidden), select:not(.hidden)");
		visibleFields.each(function () {
			const field = $(this);
			const select2Container = field.next(".select2-container");
			const isEmpty = !field.val() || (field.is("select") && field.val() === null);

			field.toggleClass("highlight", isEmpty);
			if (select2Container.length) select2Container.toggleClass("highlight", isEmpty);
			if (isEmpty) {
				isValid = false;
				if (triggerUIEffects) shakeElement(select2Container.length ? select2Container : field);
			} else {
				rowData[field.attr("name")] = field.val();
			}
		});

		const isBeneficiaryAnswered = checkBeneficiaryAnswered(lastRow);
		if (!isBeneficiaryAnswered) isValid = false;

		if (!isValid && showErrors) {
			setErrorMessage(!isBeneficiaryAnswered, fieldsToUse, elements);
		}
	} else {
		isValid = false;
	}

	return { valid: isValid, value: JSON.stringify(rowData) };
}

function updateBeneficiaryVisibility(rowDiv, registrationType) {
	const selectElement = rowDiv.querySelector(`select[name="registration"] option[value="${registrationType}"]`);
	const hideBeneficiary = !registrationType || (selectElement ? selectElement.dataset.hideBeneficiary === "true" : false);

	const beneficiaryLabel = rowDiv.querySelector(".beneficiaryLabel");
	const beneficiaryYNWrapper = rowDiv.querySelector('[name^="beneficiaryYN"]')?.closest(".half-width");

	if (hideBeneficiary) {
		beneficiaryLabel?.classList.add("hidden");
		beneficiaryYNWrapper?.classList.add("hidden");
	} else {
		beneficiaryLabel?.classList.remove("hidden");
		beneficiaryYNWrapper?.classList.remove("hidden");
	}

	// Trigger iframe height update
	updateIframeHeight(globalElements);
}

function checkBeneficiaryAnswered(lastRow) {
	const beneficiaryRadios = lastRow.find("input[name^='beneficiaryYN_']:not(.hidden)");
	let isBeneficiaryAnswered = true;
	if (beneficiaryRadios.length > 0) {
		isBeneficiaryAnswered = beneficiaryRadios.filter(":checked").length > 0;
	}
	return isBeneficiaryAnswered;
}

function toggleOtherRegistration(rowDiv, showOther) {
	const otherInput = rowDiv.querySelector('input[name="otherRegistration"]');
	if (otherInput) {
		otherInput.classList.toggle("hidden", !showOther);
		otherInput.required = showOther;
		if (!showOther) otherInput.value = "";
	}
}

// First, define all the field creation functions
function createLabelField(field) {
	const label = document.createElement("label");
	label.textContent = field.text;
	label.className = field.class;
	return label;
}

function createInputField(field) {
	const input = document.createElement("input");
	input.type = field.type || "text";
	input.name = field.name;
	input.placeholder = field.placeholder;
	input.required = allFieldsRequired;
	input.className = field.class;
	if (field.pattern) input.pattern = field.pattern;
	if (field.title) input.title = field.title;

	if (field.name === "accountNumber" && field.maskInput) {
		handleAccountNumberInput(input);
	}

	if (field.name === "value") {
		input.addEventListener("input", () => (input.value = input.value.replace(/[^0-9.]/g, "")));
		input.addEventListener("blur", () => {
			let value = parseFloat(input.value.replace(/[^0-9.]/g, "")).toFixed(2);
			input.value = isNaN(value) ? "" : `$${parseFloat(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
		});
	}

	if (field.type === "tel" && field.pattern) {
		input.addEventListener("input", () => {
			let value = input.value.replace(/[^0-9]/g, "");
			if (value.length > 3 && value.length <= 6) value = `${value.slice(0, 3)}-${value.slice(3)}`;
			else if (value.length > 6) value = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(6, 10)}`;
			input.value = value;
		});
	}

	return input;
}

function handleAccountNumberInput(input) {
	let fullNumber = "";

	input.addEventListener("input", function (e) {
		// Update the full number
		fullNumber = this.value;

		// Mask all but last 4 characters
		if (fullNumber.length > 4) {
			this.value = "*".repeat(fullNumber.length - 4) + fullNumber.slice(-4);
		} else {
			this.value = fullNumber;
		}
	});

	input.addEventListener("focus", function () {
		// Show full number when focused
		this.value = fullNumber;
	});

	input.addEventListener("blur", function () {
		// Mask again when blurred
		if (fullNumber.length > 4) {
			this.value = "*".repeat(fullNumber.length - 4) + fullNumber.slice(-4);
		} else {
			this.value = fullNumber;
		}
	});
}

function createSelectField(field, rowDiv, accountLabel) {
	const selectWrapper = document.createElement("div");
	selectWrapper.className = field.class;

	const select = document.createElement("select");
	select.name = field.name;
	select.required = allFieldsRequired;
	select.className = field.class;
	select.setAttribute("data-toggle", "select2");

	const placeholderOption = document.createElement("option");
	placeholderOption.value = "";
	placeholderOption.textContent = field.placeholder;
	placeholderOption.disabled = true;
	placeholderOption.selected = true;
	select.appendChild(placeholderOption);

	// Dynamically fetch options based on accountLabel
	const { options } = getOptions(accountLabel);
	options.forEach((option) => {
		const optionElement = document.createElement("option");
		optionElement.value = option.text;
		optionElement.textContent = option.text;
		optionElement.dataset.hideBeneficiary = option.hideBeneficiary || false;
		select.appendChild(optionElement);
	});

	selectWrapper.appendChild(select);
	rowDiv.appendChild(selectWrapper);

	$(select)
		.select2({
			placeholder: field.placeholder,
			minimumResultsForSearch: Infinity,
			width: "100%",
			allowClear: true,
		})
		.on("change", function () {
			if (field.name === "registration") {
				const selectedValue = this.value;
				updateBeneficiaryVisibility(rowDiv, selectedValue);
				toggleOtherRegistration(rowDiv, selectedValue === "Other");
				updateIframeHeight(globalElements);
			}
		});

	// Initial call to updateBeneficiaryVisibility
	if (field.name === "registration") {
		updateBeneficiaryVisibility(rowDiv, select.value);
	}
}

function createRadioButton(optionText, field, rowIndex) {
	const radioLabel = document.createElement("label");
	radioLabel.className = "fancy-radio";
	const radio = document.createElement("input");
	radio.type = "radio";
	radio.name = `${field.name}_${rowIndex}`;
	radio.value = optionText;
	radio.required = allFieldsRequired;

	const span = document.createElement("span");
	span.textContent = optionText;

	if (optionText === "Yes" && field.optionClasses && field.optionClasses[0]) {
		span.classList.add(field.optionClasses[0]);
	} else if (optionText === "No" && field.optionClasses && field.optionClasses[1]) {
		span.classList.add(field.optionClasses[1]);
	}

	radioLabel.appendChild(radio);
	radioLabel.appendChild(span);

	return radioLabel;
}

function createFancyRadioField(field, rowDiv, rowIndex, elements) {
	const radioWrapper = document.createElement("div");
	radioWrapper.className = field.class;

	field.options.forEach((optionText) => {
		const radioLabel = createRadioButton(optionText, field, rowIndex, allFieldsRequired);
		radioWrapper.appendChild(radioLabel);

		const radio = radioLabel.querySelector("input[type='radio']");
		radio.addEventListener("change", function () {
			// console.log(`Radio changed: ${this.name}, value: ${this.value}`);
			handleRadioChange(radio, rowDiv, elements, globalFieldsToUse);
		});

		// Set initial state for "No" option
		if (optionText === "No") {
			radio.checked = true;
			// Don't call handleRadioChange here, as the beneficiary fields might not exist yet
		}
	});

	return radioWrapper;
}

// Dynamic Content Creation Functions

const fieldCreators = {
	label: createLabelField,
	select: createSelectField,
	fancyRadio: createFancyRadioField,
	default: createInputField,
};

function createRowContent(fieldsToUse, accountLabel, elements) {
    const rowDiv = document.createElement("div");
    rowDiv.className = "row";
    const rowNumber = document.createElement("span");
    rowNumber.className = "row-number";
    const rowLabel = fieldsToUse.uiText.rowLabel;
    const rowIndex = elements.dataContainer.children().length + 1;

    rowNumber.textContent = `${accountLabel} ${rowIndex}`;
    rowDiv.appendChild(rowNumber);

    if (accountLabel === "Business & Trust Accounts") {
        fieldsToUse.fields = fieldsToUse.fields.filter((field) => !["beneficiaryLabel", "beneficiaryYN", "beneficiaryName", "beneficiaryPhoneNumber"].includes(field.name));
    }

    fieldsToUse.fields.forEach((field) => {
        const creator = fieldCreators[field.type] || fieldCreators.default;
        let element;

        if (field.type === "label") {
            element = creator(field);
            if (field.name === "beneficiaryLabel") {
                element.classList.add("hidden");
            }
        } else if (field.type === "select") {
            creator(field, rowDiv, accountLabel);
            return; // createSelectField handles its own appending
        } else if (field.type === "fancyRadio") {
            element = creator(field, rowDiv, rowIndex, elements);
            if (field.name === "beneficiaryYN") {
                element.classList.add("hidden");
            }
        } else if (field.type === "checkbox" && field.name === "sameAsName") {
            element = creator(field);
            // Show checkbox only for Taxable Investment and Retirement accounts
            if (["Taxable Investment", "Retirement"].includes(accountLabel)) {
                element.classList.remove("hidden");
            } else {
                element.classList.add("hidden");
            }
        } else {
            element = creator(field);
            if (field.name === "beneficiaryName" || field.name === "beneficiaryPhoneNumber") {
                element.classList.add("hidden");
            }
        }

        if (element) {
            rowDiv.appendChild(element);
        }
    });

    // Add event listener to the registration select field
    const registrationSelect = rowDiv.querySelector('select[name="registration"]');
    if (registrationSelect) {
        registrationSelect.addEventListener("change", function () {
            updateBeneficiaryVisibility(rowDiv, this.value);
            toggleOtherRegistration(rowDiv, this.value === "Other");

            // Log bypassProbate when form is loaded
            const hasBeneficiary = rowDiv.querySelector('input[name^="beneficiaryYN"]:checked')?.value === "Yes";
            const bypassProbate = getBypassProbate(accountLabel, this.value, hasBeneficiary);
            console.log(`Form loaded - bypassProbate: ${bypassProbate}`);
        });
    }

    // Trigger the visibility update initially with an empty value
    updateBeneficiaryVisibility(rowDiv, "");

    return rowDiv;
}

// Row Manipulation Functions

function addRow(elements, fieldsToUse, accountLabel) {
	const validationResult = validateLastRow(elements, fieldsToUse, true, true); // Now passing true for triggerUIEffects
	// console.log(`Attempting to add row. Validation result:`, validationResult);

	if (!validationResult.valid) {
		console.log("Cannot add new row due to validation errors.");
		setErrorMessage(true, fieldsToUse, elements); // Explicitly call setErrorMessage
		shakeElement(elements.addButton); // Shake the add button to indicate an error
		return; // Stop the function if not valid
	}

	// If valid, proceed to add the row
	const rowDiv = createRowContent(fieldsToUse, accountLabel, elements);
	elements.dataContainer.append(rowDiv);
	$(".datepicker").datepicker({
		dateFormat: "yy-mm-dd",
	});
	setActionButtonText(elements, fieldsToUse);
	updateIframeHeight(elements);
	JFCustomWidget.sendData(validationResult); // Send updated valid state
}

function removeRow(elements, fieldsToUse, accountLabel) {
	const { errorMessageContainer } = elements;
	const rows = document.querySelectorAll(".row");
	if (rows.length > 1) {
		const confirmRemove = confirm("Are you sure you want to remove this account?");
		if (confirmRemove) {
			rows[rows.length - 1].remove();
			updateIframeHeight(elements);
			setActionButtonText(elements, fieldsToUse, accountLabel);
		}
	} else {
		errorMessageContainer.textContent = "You can't remove the first row";
		fadeOutElement(errorMessageContainer, 1000);
	}
}

// UI Update Functions
function setActionButtonText(elements, fieldsToUse, accountLabel) {
	// console.log("Setting action button text", { elements, fieldsToUse, accountLabel });

	if (!elements || !elements.addButton || !elements.removeButton || !elements.dataContainer) {
		console.error("Error: Missing required elements for setting button text");
		return;
	}

	if (!fieldsToUse || !fieldsToUse.uiText) {
		console.error("Error: Missing fieldsToUse or uiText");
		return;
	}

	const { addButton, removeButton, dataContainer } = elements;
	const rowLabel = fieldsToUse.uiText.rowLabel;

	addButton.text(`Add ${rowLabel}`);

	const rowCount = dataContainer.children().length;
	removeButton.text(rowCount > 1 ? `Remove ${rowLabel}` : "");
	removeButton.css("display", rowCount > 1 ? "inline-block" : "none");

	// console.log("Action button text set", {
	//     addButtonText: addButton.text(),
	//     removeButtonText: removeButton.text(),
	//     removeButtonDisplay: removeButton.css('display')
	// });
}

function setErrorMessage(hasEmptyFields, fieldsToUse, elements) {
	// console.log("setErrorMessage called with:", { hasEmptyFields, fieldsToUse, elements });

	if (!elements || !elements.errorMessageContainer || !fieldsToUse) {
		console.error("Error: Necessary elements or field settings are undefined", { elements, fieldsToUse });
		return;
	}

	const { errorMessageContainer } = elements;
	if (!hasEmptyFields) {
		console.log("No empty fields, not setting error message");
		return;
	}

	// Use globalFieldsToUse if fieldsToUse is not provided or missing uiText
	const rowLabel = (fieldsToUse.uiText || globalFieldsToUse.uiText).rowLabel;

	// console.log("Setting error message", { rowLabel, errorMessageContainer });

	if (errorMessageContainer && errorMessageContainer.length > 0) {
		errorMessageContainer.text(`Please fill all fields before adding another ${rowLabel}.`);
		errorMessageContainer.css("display", "block");
		fadeOutElement(errorMessageContainer, 4000);
	} else {
		console.error("Error message container not found");
	}
}

function fadeOutElement(element, duration = 4000) {
	element.removeClass("fade-out");
	setTimeout(() => {
		element.addClass("fade-out");
		setTimeout(() => element.css("display", "none"), duration);
	}, 1000); // Small delay to ensure the class is added
}

function shakeElement(element) {
	element.addClass("shake");
	setTimeout(() => element.removeClass("shake"), 1000);
}

function updateIframeHeight(elements) {
	const { widgetContainer } = elements;
	const newHeight = Math.max(widgetContainer.scrollHeight + 50, 450);
	JFCustomWidget.requestFrameResize({
		height: newHeight,
	});
}

JFCustomWidget.subscribe("submit", function () {
	const $widgetContainer = $("#widgetContainer");
	const $dataContainer = $widgetContainer.find("#dataContainer");
	const isVisible = $widgetContainer.is(":visible");
	const accountType = JFCustomWidget.getWidgetSetting("accountLabel");

	let accountsData = [];

	if (isVisible) {
		const $rows = $dataContainer.find(".row");
		$rows.each(function (index) {
			let registrationType = "";
			let otherRegistration = "";
			let beneficiaryYNChecked = false;
			let beneficiaryYNValue = "";

			const rowData = {
				rowIndex: index + 1,
				accountType: accountType,
			};

			$(this)
				.find("input, select")
				.each(function () {
					let inputName = this.name.replace(/_\d+$/, "");
					if ($(this).attr("type") === "radio") {
						if ($(this).is(":checked")) {
							rowData[inputName] = $(this).val();
							if (inputName === "beneficiaryYN") {
								beneficiaryYNChecked = true;
								beneficiaryYNValue = $(this).val();
							}
						}
					} else if (inputName === "registration") {
						registrationType = $(this).val();
					} else if (inputName === "otherRegistration") {
						otherRegistration = $(this).val();
					} else {
						rowData[inputName] = $(this).val() || "";
					}
				});

			// Only process the row if a registration type is selected or other registration is filled
			if (registrationType || otherRegistration) {
				rowData["registration"] = otherRegistration || registrationType;

				if (accountType === "Important Legal Document") {
					// For legal documents, use documentName as the title if available
					if (rowData["documentName"]) {
						rowData["title"] = rowData["documentName"];
						delete rowData["documentName"]; // Remove the separate documentName field
					}
					rowData["bypassProbate"] = "N/A";
				} else {
					if (beneficiaryYNChecked && beneficiaryYNValue === "No") {
						rowData["beneficiaryName"] = "N/A";
						rowData["beneficiaryPhoneNumber"] = "N/A";
					} else if (!beneficiaryYNChecked) {
						rowData["beneficiaryYN"] = "N/A";
						rowData["beneficiaryName"] = "N/A";
						rowData["beneficiaryPhoneNumber"] = "N/A";
					}

					const hasBeneficiary = beneficiaryYNValue === "Yes";
					rowData["bypassProbate"] = getBypassProbate(accountType, rowData["registration"], hasBeneficiary);
				}

				// Remove any empty fields
				Object.keys(rowData).forEach((key) => {
					if (rowData[key] === "") {
						delete rowData[key];
					}
				});

				if (Object.keys(rowData).length > 2) {
					// More than just rowIndex and accountType
					accountsData.push(rowData);
				}
			}
		});
	}

	if (accountsData.length > 0) {
		JFCustomWidget.sendSubmit({
			valid: true,
			value: JSON.stringify({ accounts: accountsData }),
		});
	} else {
		JFCustomWidget.sendSubmit({
			valid: true,
			value: null,
		});
	}
});
