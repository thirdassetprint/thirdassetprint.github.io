//accounts.js starts here

// Global variables
let allFieldsRequired = true;
let isWidgetValid = false;
let globalElements;
let globalFieldsToUse;

let isJotFormReady = false;
let isDOMReady = false;

document.addEventListener("DOMContentLoaded", function () {
  isDOMReady = true;
  initializeWidgetWhenReady();
});

function initializeWidgetWhenReady() {
  if (isJotFormReady && isDOMReady) {
    initializeWidget(JFCustomWidget.getWidgetSettings());
  }
}

JFCustomWidget.subscribe("ready", function (data) {
  console.log("🚀 JFCustomWidget ready event received:", {
    accountLabel: JFCustomWidget.getWidgetSetting("accountLabel"),
  });

  isJotFormReady = true;
  initializeWidgetWhenReady();

  if (data && data.value) {
    try {
      let savedData =
        typeof data.value === "string" ? JSON.parse(data.value) : data.value;

      if (savedData) {
        if (!savedData.accounts) {
          savedData = { accounts: [savedData] };
        }

        setTimeout(() => {
          populateWidgetFromSavedData(savedData, globalElements, {
            fieldsToUse: globalFieldsToUse,
            accountLabel: JFCustomWidget.getWidgetSetting("accountLabel"),
          });
        }, 100);
      }
    } catch (error) {
      console.error("❌ Error parsing saved data:", error);
    }
  }

  setTimeout(() => {
    const formData = collectAllFormsData();
    if (formData.length > 0) {
      console.log("📤 Sending data to JotForm:", { accounts: formData });
      JFCustomWidget.sendData({
        valid: true,
        value: JSON.stringify({ accounts: formData }),
      });
    }
  }, 200);

  // Simplified change event handler
  $("#dataContainer")
    .off("change")
    .on("change", "input, select", function () {
      const formData = collectAllFormsData();

      // Always send all form data
      JFCustomWidget.sendData({
        valid: true,
        value: JSON.stringify({ accounts: formData }),
      });
    });
});

function collectAllFormsData() {
  const formData = [];
  const accountType = JFCustomWidget.getWidgetSetting("accountLabel");

  if ($("#dataContainer .row").length === 0) {
    return [];
  }

  $("#dataContainer .row").each(function (index) {
    const rowData = {
      rowIndex: index + 1,
      accountType: accountType,
    };

    $(this)
      .find("input, select")
      .each(function () {
        const field = $(this);
        const name = field.attr("name").replace(/_\d+$/, "");

        if (field.attr("type") === "radio") {
          if (field.is(":checked")) {
            rowData[name] = field.val();
          }
        } else if (name === "registration") {
          rowData[name] = field.val();
        } else if (name === "otherRegistration" && field.val()) {
          rowData["registration"] = field.val();
        } else {
          rowData[name] = field.val() || "";
        }
      });

    // Keep only essential type-specific logging
    if (accountType === "Important Legal Documents") {
      rowData["beneficiaryYN"] =
        rowData["documentLocation"] || rowData["title"];
      rowData["bypassProbate"] = "N/A";
    } else if (accountType === "Business and Trust Accounts") {
      rowData["bypassProbate"] = true;
      rowData["beneficiaryYN"] = "N/A";
      rowData["beneficiaryName"] = "N/A";
      rowData["beneficiaryPhoneNumber"] = "N/A";
    } else {
      const hasBeneficiary =
        $(`input[name^="beneficiaryYN_${index + 1}"]:checked`).val() === "Yes";
      rowData["bypassProbate"] = getBypassProbate(
        accountType,
        rowData["registration"],
        hasBeneficiary
      );
    }

    Object.keys(rowData).forEach((key) => {
      if (rowData[key] === "") {
        delete rowData[key];
      }
    });

    if (Object.keys(rowData).length > 2) {
      formData.push(rowData);
    }
  });

  formData.forEach((item, index) => {
    item.rowIndex = index + 1;
  });

  return formData;
}

function initializeWidget(data) {
  const accountLabel = data.accountLabel;
  console.log("Account Label:", accountLabel);
  if (!accountLabel) {
    console.error("Account Label is not set in widget settings");
    return;
  }

  const $widgetContainer = $("#widgetContainer");
  const elements = initializeElements($widgetContainer);
  if (!elements) {
    console.error("Failed to initialize elements for container");
    return;
  }

  globalElements = elements;

  const config = configureWidget(elements, accountLabel);
  if (!config) {
    console.error("Failed to configure widget for elements");
    return;
  }

  globalFieldsToUse = config.fieldsToUse;
  setupWidget($widgetContainer, elements, config, data);
}

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
      const validationResult = validateLastRow(
        elements,
        config.fieldsToUse,
        true
      );
      console.log("Revalidating on change event:", validationResult);
      JFCustomWidget.sendData(validationResult);
    });
}

function populateWidgetFromSavedData(savedData, elements, config) {
  try {
    if (!elements || !elements.dataContainer) {
      console.error("❌ Elements not properly initialized");
      return;
    }

    if (
      !savedData ||
      !savedData.accounts ||
      !Array.isArray(savedData.accounts)
    ) {
      console.error("❌ Invalid saved data format");
      return;
    }

    elements.dataContainer.empty();

    savedData.accounts.forEach((account, index) => {
      const rowDiv = createRowContent(
        config.fieldsToUse,
        account.accountType || config.accountLabel,
        elements
      );

      if (!rowDiv) {
        console.error(`❌ Failed to create row for account ${index + 1}`);
        return;
      }

      elements.dataContainer.append(rowDiv);

      // Populate the fields
      Object.keys(account).forEach((key) => {
        const field = rowDiv.querySelector(`[name^="${key}"]`);
        if (field) {
          try {
            if (field.type === "radio") {
              const radio = rowDiv.querySelector(
                `[name^="${key}"][value="${account[key]}"]`
              );
              if (radio) {
                radio.checked = true;
                if (key === "beneficiaryYN") {
                  $(radio).trigger("change");
                }
              }
            } else if (field.tagName === "SELECT") {
              const options = Array.from(field.options);
              const matchingOption = options.find(
                (option) =>
                  option.value.toLowerCase() === account[key].toLowerCase()
              );

              if (matchingOption) {
                field.value = matchingOption.value;
                $(field).trigger("change");
              }
            } else if (key === "value" || key === "value2") {
              // Format value fields with dollar sign and proper decimal places
              const numericValue = parseFloat(
                account[key].replace(/[^0-9.-]/g, "")
              );
              if (!isNaN(numericValue)) {
                field.value = `$${numericValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}`;
              } else {
                field.value = account[key];
              }

              field.addEventListener(
                "input",
                () => (field.value = field.value.replace(/[^0-9.]/g, ""))
              );
              field.addEventListener("blur", () => {
                let value = parseFloat(
                  field.value.replace(/[^0-9.]/g, "")
                ).toFixed(2);
                field.value = isNaN(value)
                  ? ""
                  : `$${parseFloat(value).toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`;
              });
            } else {
              field.value = account[key];
            }
          } catch (fieldError) {
            console.error(`❌ Error populating field ${key}:`, fieldError);
          }
        }
      });

      // Update visibility of fields based on populated data
      updateBeneficiaryVisibility(rowDiv, account.registration);
      toggleOtherRegistration(rowDiv, account.registration === "Other");
    });

    setActionButtonText(elements, config.fieldsToUse);
    updateIframeHeight(elements);

    const validationResult = validateLastRow(
      elements,
      config.fieldsToUse,
      false
    );
    JFCustomWidget.sendData(validationResult);
  } catch (error) {
    console.error("❌ Error during widget population:", error);
  }
}

function initializeElements(container) {
  const elements = {
    dataContainer: container.find("#dataContainer"),
    widgetContainer: container,
    errorMessageContainer: container.find("#errorMessage"),
    addButton: container.find(".addRow"),
    removeButton: container.find(".removeRow"),
  };

  Object.keys(elements).forEach((key) => {
    if (elements[key].length === 0) {
      console.error(
        `Initialization failed: ${key} not found in container`,
        container
      );
    }
  });

  return elements;
}

function configureWidget(elements, accountLabel) {
  console.log("Configuring widget for:", accountLabel);
  if (!accountLabel) {
    console.error("Account Label is not set");
    return null;
  }

  const fieldsToUse = getFieldsToUse(accountLabel);
  console.log("Fields to use:", fieldsToUse);
  if (!fieldsToUse) {
    console.error("No fields configuration found for the given account label.");
    return null;
  }
  return { accountLabel, fieldsToUse };
}

function attachEventListeners(elements, fieldsToUse, accountLabel) {
  elements.addButton.addEventListener("click", () =>
    addRow(elements, fieldsToUse, accountLabel)
  );
  elements.removeButton.addEventListener("click", () =>
    removeRow(elements, fieldsToUse, accountLabel)
  );
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
  console.log("Getting fields for:", accountLabel);
  console.log("Available mappings:", Object.keys(widgetSettingsMapping));

  // Convert accountLabel to lowercase, replace spaces with underscores, and remove any non-alphanumeric characters
  const key = accountLabel
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");

  console.log("Lookup key:", key);

  if (widgetSettingsMapping[key]) {
    console.log("Found exact match for:", key);
    return widgetSettingsMapping[key];
  } else {
    // If no exact match, try to find a partial match
    const partialMatch = Object.keys(widgetSettingsMapping).find((k) =>
      key.includes(k)
    );
    if (partialMatch) {
      console.log("Found partial match:", partialMatch);
      return widgetSettingsMapping[partialMatch];
    } else {
      console.warn(
        `No match found for ${accountLabel}, using default account fields`
      );
      return widgetSettingsMapping["account"];
    }
  }
}

function handleRadioChange(radio, rowDiv, elements, fieldsToUse) {
  const isVisible = radio.value === "Yes";
  const fields = ["beneficiaryName", "beneficiaryPhoneNumber"].map((name) =>
    rowDiv.querySelector(`input[name='${name}']`)
  );

  fields.forEach((field) => {
    if (field) {
      field.classList.toggle("hidden", !isVisible);
      field.classList.toggle("visible", isVisible);
      field.required = isVisible && allFieldsRequired;
    }
  });

  const accountLabel = JFCustomWidget.getWidgetSetting("accountLabel");
  const registrationType = rowDiv.querySelector(
    'select[name="registration"]'
  ).value;
  const bypassProbate = getBypassProbate(
    accountLabel,
    registrationType,
    isVisible
  );
  console.log(`BeneficiaryYN changed - bypassProbate: ${bypassProbate}`);

  updateIframeHeight(elements);
  isWidgetValid = validateLastRow(elements, fieldsToUse);
  JFCustomWidget.sendData({ valid: isWidgetValid });
}

function validateLastRow(
  elements,
  fieldsToUse,
  showErrors = true,
  triggerUIEffects = false
) {
  const { dataContainer, errorMessageContainer } = elements;
  const lastRow = dataContainer.children().last();
  let isValid = true;
  let rowData = {};

  if (lastRow.length && allFieldsRequired) {
    const visibleFields = lastRow.find(
      "input:not(.hidden), select:not(.hidden)"
    );
    visibleFields.each(function () {
      const field = $(this);
      const select2Container = field.next(".select2-container");
      const isEmpty =
        !field.val() || (field.is("select") && field.val() === null);

      field.toggleClass("highlight", isEmpty);
      if (select2Container.length)
        select2Container.toggleClass("highlight", isEmpty);
      if (isEmpty) {
        isValid = false;
        if (triggerUIEffects)
          shakeElement(select2Container.length ? select2Container : field);
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
  const accountLabel = JFCustomWidget.getWidgetSetting("accountLabel");
  const option = optionsDataWithOther[accountLabel]?.find(
    (opt) => opt.text === registrationType
  );
  const hideBeneficiary = !registrationType || option?.hideBeneficiary === true;

  const beneficiaryLabel = rowDiv.querySelector(".beneficiaryLabel");
  const beneficiaryYNWrapper = rowDiv
    .querySelector('[name^="beneficiaryYN"]')
    ?.closest(".half-width");
  const beneficiaryFields = ["beneficiaryName", "beneficiaryPhoneNumber"].map(
    (name) => rowDiv.querySelector(`input[name='${name}']`)
  );

  if (hideBeneficiary) {
    beneficiaryLabel?.classList.add("hidden");
    beneficiaryYNWrapper?.classList.add("hidden");
    beneficiaryFields.forEach((field) => {
      if (field) {
        field.classList.remove("visible");
        field.classList.add("hidden");
        field.required = false;
      }
    });
  } else {
    beneficiaryLabel?.classList.remove("hidden");
    beneficiaryYNWrapper?.classList.remove("hidden");

    // Se o radio "Yes" estiver marcado, mostra os campos de beneficiário
    const beneficiaryYNRadio = rowDiv.querySelector(
      'input[name^="beneficiaryYN"][value="Yes"]:checked'
    );
    if (beneficiaryYNRadio) {
      beneficiaryFields.forEach((field) => {
        if (field) {
          field.classList.remove("hidden");
          field.classList.add("visible");
          field.required = allFieldsRequired;
        }
      });
    }
  }

  // Trigger iframe height update
  updateIframeHeight(globalElements);
}

function checkBeneficiaryAnswered(lastRow) {
  const beneficiaryRadios = lastRow.find(
    "input[name^='beneficiaryYN_']:not(.hidden)"
  );
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

  if (field.name === "value" || field.name === "value2") {
    input.addEventListener(
      "input",
      () => (input.value = input.value.replace(/[^0-9.]/g, ""))
    );
    input.addEventListener("blur", () => {
      let value = parseFloat(input.value.replace(/[^0-9.]/g, "")).toFixed(2);
      input.value = isNaN(value)
        ? ""
        : `$${parseFloat(value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
    });
  }

  if (field.type === "tel" && field.pattern) {
    input.addEventListener("input", () => {
      let value = input.value.replace(/[^0-9]/g, "");
      if (value.length > 3 && value.length <= 6)
        value = `${value.slice(0, 3)}-${value.slice(3)}`;
      else if (value.length > 6)
        value = `${value.slice(0, 3)}-${value.slice(3, 6)}-${value.slice(
          6,
          10
        )}`;
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
  console.log("Creating select field for:", accountLabel);

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

  // Get options from optionsDataWithOther
  const options = optionsDataWithOther[accountLabel] || [];
  options.forEach((option) => {
    const optionElement = document.createElement("option");
    optionElement.value = option.text;
    optionElement.textContent = option.text;
    // Não precisamos mais do dataset.hideBeneficiary pois agora usamos o optionsData
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
  } else if (
    optionText === "No" &&
    field.optionClasses &&
    field.optionClasses[1]
  ) {
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
    const radioLabel = createRadioButton(
      optionText,
      field,
      rowIndex,
      allFieldsRequired
    );
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
  console.log("Creating row for:", accountLabel);
  console.log("Fields to use:", fieldsToUse);

  const rowDiv = document.createElement("div");
  rowDiv.className = "row";
  const rowNumber = document.createElement("span");
  rowNumber.className = "row-number";
  const rowIndex = elements.dataContainer.children().length + 1;

  // Using getOptions to obtain the formatted label
  const { accountLabel: formattedLabel } = getOptions(accountLabel);
  rowNumber.textContent = formattedLabel + (rowIndex > 1 ? ` ${rowIndex}` : "");
  rowDiv.appendChild(rowNumber);

  if (accountLabel === "Business and Trust Accounts") {
    fieldsToUse.fields = fieldsToUse.fields.filter(
      (field) =>
        ![
          "beneficiaryLabel",
          "beneficiaryYN",
          "beneficiaryName",
          "beneficiaryPhoneNumber",
        ].includes(field.name)
    );
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
    } else {
      element = creator(field);
      if (
        field.name === "beneficiaryName" ||
        field.name === "beneficiaryPhoneNumber"
      ) {
        element.classList.add("hidden");
      }
    }

    if (element) {
      rowDiv.appendChild(element);
    }
  });

  // Add event listener to the registration select field
  const registrationSelect = rowDiv.querySelector(
    'select[name="registration"]'
  );
  if (registrationSelect) {
    registrationSelect.addEventListener("change", function () {
      updateBeneficiaryVisibility(rowDiv, this.value);
      toggleOtherRegistration(rowDiv, this.value === "Other");

      // Log bypassProbate when form is loaded
      const hasBeneficiary =
        rowDiv.querySelector('input[name^="beneficiaryYN"]:checked')?.value ===
        "Yes";
      const bypassProbate = getBypassProbate(
        accountLabel,
        this.value,
        hasBeneficiary
      );
      console.log(`Form loaded - bypassProbate: ${bypassProbate}`);
    });
  }

  // Trigger the visibility update initially with an empty value
  updateBeneficiaryVisibility(rowDiv, "");

  return rowDiv;
}

// Row Manipulation Functions

function addRow(elements, fieldsToUse, accountLabel) {
  const validationResult = validateLastRow(elements, fieldsToUse, true, true);

  if (!validationResult.valid) {
    console.log("Cannot add new row due to validation errors.");
    setErrorMessage(true, fieldsToUse, elements);
    shakeElement(elements.addButton);
    return;
  }

  // If valid, proceed to add the row
  const rowDiv = createRowContent(fieldsToUse, accountLabel, elements);
  elements.dataContainer.append(rowDiv);

  // Add event listeners for value fields in the new row
  rowDiv.querySelectorAll('input[name^="value"]').forEach((input) => {
    input.addEventListener(
      "input",
      () => (input.value = input.value.replace(/[^0-9.]/g, ""))
    );
    input.addEventListener("blur", () => {
      let value = parseFloat(input.value.replace(/[^0-9.]/g, "")).toFixed(2);
      input.value = isNaN(value)
        ? ""
        : `$${parseFloat(value).toLocaleString(undefined, {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })}`;
    });
  });

  $(".datepicker").datepicker({
    dateFormat: "yy-mm-dd",
  });
  setActionButtonText(elements, fieldsToUse);
  updateIframeHeight(elements);
  JFCustomWidget.sendData(validationResult);
}

function removeRow(elements, fieldsToUse, accountLabel) {
  const { errorMessageContainer } = elements;
  const rows = document.querySelectorAll(".row");
  if (rows.length > 1) {
    const lastRow = rows[rows.length - 1];
    const registrationSelect = lastRow.querySelector(
      'select[name^="registration"]'
    );
    let accountType = accountLabel;

    // If a registration type is selected, use it for a more specific message
    if (registrationSelect && registrationSelect.value) {
      accountType = registrationSelect.value;
    }

    // Create a friendly name for the account type
    const friendlyAccountType = accountType
      .replace(/_/g, " ")
      .replace(
        /\w\S*/g,
        (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
      );

    const confirmMessage = `Are you sure you want to remove this ${friendlyAccountType}?`;
    const confirmRemove = confirm(confirmMessage);

    if (confirmRemove) {
      lastRow.remove();
      updateIframeHeight(elements);
      setActionButtonText(elements, fieldsToUse, accountLabel);

      // Collect and send updated data after removal
      const formData = collectAllFormsData();

      // Send updated data to JotForm
      JFCustomWidget.sendData({
        valid: true,
        value: JSON.stringify({ accounts: formData }),
      });
    }
  } else {
    errorMessageContainer.textContent = "You can't remove the first row";
    fadeOutElement(errorMessageContainer, 1000);
  }
}

// UI Update Functions
function setActionButtonText(elements, fieldsToUse, accountLabel) {
  // console.log("Setting action button text", { elements, fieldsToUse, accountLabel });

  if (
    !elements ||
    !elements.addButton ||
    !elements.removeButton ||
    !elements.dataContainer
  ) {
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
}

function setErrorMessage(hasEmptyFields, fieldsToUse, elements) {
  if (!elements || !elements.errorMessageContainer || !fieldsToUse) {
    console.error("Error: Necessary elements or field settings are undefined", {
      elements,
      fieldsToUse,
    });
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
    errorMessageContainer.text(
      `Please fill all fields before adding another ${rowLabel}.`
    );
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

  // Get the account label from the widget settings in display format,
  // then convert it to the submission format.
  const accountTypeDisplay = JFCustomWidget.getWidgetSetting("accountLabel");
  const accountTypeSubmission = toSubmissionFormat(accountTypeDisplay);

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
        accountType: accountTypeSubmission,
      };

      // Collect all fields from this row
      $(this)
        .find("input, select")
        .each(function () {
          const field = $(this);
          const name = field.attr("name").replace(/_\d+$/, "");

          if (field.attr("type") === "radio") {
            if (field.is(":checked")) {
              rowData[name] = field.val();
              if (name === "beneficiaryYN") {
                beneficiaryYNChecked = true;
                beneficiaryYNValue = field.val();
              }
            }
          } else if (name === "registration") {
            registrationType = field.val();
            rowData[name] = field.val();
          } else if (name === "otherRegistration") {
            otherRegistration = field.val();
            if (otherRegistration) {
              rowData["registration"] = otherRegistration;
            }
          } else {
            rowData[name] = field.val() || "";
          }
        });

      // Process row only if it has a selected registration type
      if (registrationType || otherRegistration) {
        // Specific handling by account type
        if (accountType === "Important Legal Documents") {
          rowData["beneficiaryYN"] =
            rowData["documentLocation"] || rowData["title"];
          delete rowData["documentLocation"];
          rowData["bypassProbate"] = "N/A";
          delete rowData["beneficiaryName"];
          delete rowData["beneficiaryPhoneNumber"];
        } else if (accountType === "Business and Trust Accounts") {
          rowData["bypassProbate"] = true;
          rowData["beneficiaryYN"] = "N/A";
          rowData["beneficiaryName"] = "N/A";
          rowData["beneficiaryPhoneNumber"] = "N/A";
        } else if (accountType === "Checking and Savings Accounts") {
          rowData["advisorName"] = "N/A";
          rowData["advisorPhoneNumber"] = "N/A";
          rowData["value"] = "N/A";

          // Beneficiary handling
          if (beneficiaryYNChecked && beneficiaryYNValue === "No") {
            rowData["beneficiaryName"] = "N/A";
            rowData["beneficiaryPhoneNumber"] = "N/A";
          } else if (!beneficiaryYNChecked) {
            rowData["beneficiaryYN"] = "N/A";
            rowData["beneficiaryName"] = "N/A";
            rowData["beneficiaryPhoneNumber"] = "N/A";
          }

          const hasBeneficiary = beneficiaryYNValue === "Yes";
          rowData["bypassProbate"] = getBypassProbate(
            accountType,
            rowData["registration"],
            hasBeneficiary
          );
        } else {
          // Default handling for other account types
          if (beneficiaryYNChecked && beneficiaryYNValue === "No") {
            rowData["beneficiaryName"] = "N/A";
            rowData["beneficiaryPhoneNumber"] = "N/A";
          } else if (!beneficiaryYNChecked) {
            rowData["beneficiaryYN"] = "N/A";
            rowData["beneficiaryName"] = "N/A";
            rowData["beneficiaryPhoneNumber"] = "N/A";
          }

          const hasBeneficiary = beneficiaryYNValue === "Yes";
          rowData["bypassProbate"] = getBypassProbate(
            accountType,
            rowData["registration"],
            hasBeneficiary
          );
        }

        // Remove empty fields
        Object.keys(rowData).forEach((key) => {
          if (rowData[key] === "") {
            delete rowData[key];
          }
        });

        // Add only if it has data beyond rowIndex and accountType
        if (Object.keys(rowData).length > 2) {
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
