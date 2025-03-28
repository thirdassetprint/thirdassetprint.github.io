//options.js starts here

const optionsData = {
  "Checking and Savings Accounts": [
    { text: "Individual", hideBeneficiary: true, bypassProbate: false },
    {
      text: "Joint Account with Rights of Survivorship (JTWRS)",
      hideBeneficiary: true,
      bypassProbate: true,
    },
    { text: "Payable on Death (POD)", bypassProbate: true },
    { text: "Corporate", hideBeneficiary: true, bypassProbate: false },
  ],
  "Taxable Investment": [
    { text: "Individual", hideBeneficiary: true, bypassProbate: false },
    {
      text: "Joint Tenants with Rights of Survivorship",
      hideBeneficiary: true,
      bypassProbate: true,
    },
    {
      text: "Joint Tenants in Common",
      hideBeneficiary: true,
      bypassProbate: false,
    },
    {
      text: "Joint Tenants in Entirety",
      hideBeneficiary: true,
      bypassProbate: true,
    },
    {
      text: "Joint Community Property",
      hideBeneficiary: true,
      bypassProbate: false,
    },
    { text: "Individual – Transfer on Death (TOD)", bypassProbate: true },
    {
      text: "Joint Tenants with Rights of Survivorship – Transfer on Death (TOD)",
      bypassProbate: true,
    },
    {
      text: "Joint Tenants in Entirety – Transfer on Death (TOD)",
      bypassProbate: true,
    },
  ],
  Retirement: [
    { text: "Traditional IRA" },
    { text: "Roth IRA" },
    { text: "Rollover IRA" },
    { text: "SEP IRA" },
    { text: "SIMPLE IRA" },
    { text: "IRA BDA" },
    { text: "Roth IRA BDA" },
    { text: "401(k) Plan" },
    { text: "Solo 401(k)/Individual 401(k)" },
    { text: "Profit-Sharing Plan" },
    { text: "Defined Benefit Plan" },
    { text: "403(b) Plan" },
    { text: "457 Plan" },
    { text: "Thrift Savings Plan (TSP)" },
  ],
  "Accounts for Minors": [
    { text: "Uniform Gifts to Minors Act (UGMA)" },
    { text: "Uniform Transfers to Minors Act (UTMA)" },
    { text: "529" },
  ],
  "Business and Trust Accounts": [
    { text: "Trust Under Agreement" },
    { text: "Trust Under Will" },
    { text: "Corporation" },
    { text: "Limited Liability Company (LLC)" },
    { text: "Non-Prototype" },
  ],
  Insurance: [
    { text: "Whole Life" },
    { text: "Term Life" },
    { text: "Universal Life" },
    { text: "Variable Life" },
  ],
  "Important Legal Documents": [
    { text: "Last Will and Testament" },
    { text: "Trust Agreement" },
    { text: "Durable Power of Attorney" },
    { text: "Healthcare Power of Attorney" },
    { text: "Tax Returns" },
  ],
};

// Define custom placeholders for otherRegistration
const otherRegistrationPlaceholders = {
  "Checking and Savings Accounts": "Other Checking or Savings Account Type",
  "Taxable Investment": "Other Taxable Investment Account Type",
  Retirement: "Other Retirement Account Type",
  "Accounts for Minors": "Other Account for Minors Type",
  "Business and Trust Accounts": "Other Business or Trust Account Type",
  Insurance: "Other Insurance Policy Type",
  "Important Legal Documents": "Other Legal Document Type",
};

/**
 * Converts a display string (e.g. "Checking and Savings Accounts")
 * to an internal key in snake_case for widgetSettingsMapping lookup.
 * Example: "Checking and Savings Accounts" -> "checking_and_savings_accounts"
 */
function toInternalFormat(str) {
  return str
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

/**
 * Converts a display string to the submission format.
 * The submission format concatenates the words (without spaces) while preserving capitalization.
 * Example: "Checking and Savings Accounts" -> "CheckingandSavingsAccounts"
 */
function toSubmissionFormat(str) {
  return str.replace(/\s+/g, "");
}

/**
 * (Optional) Converts an internal string in snake_case back to the display format.
 * Example: "checking_and_savings_accounts" -> "Checking and Savings Accounts"
 */
function toDisplayFormat(str) {
  if (str.indexOf("_") > -1) {
    return str
      .split("_")
      .map(function (word) {
        return word.charAt(0).toUpperCase() + word.slice(1);
      })
      .join(" ");
  }
  return str;
}

// Function to add "Other" option to all account types
function addOtherOption(options) {
  for (let accountType in options) {
    options[accountType].push({ text: "Other" });
  }
  return options;
}

// Apply the "Other" option to all account types
const optionsDataWithOther = addOtherOption(optionsData);

// Modify the getOptions function to handle legal documents properly
function getOptions(accountLabel) {
  console.log("Getting options for:", accountLabel);

  // Convert the accountLabel to an internal format
  const internalKey = toInternalFormat(accountLabel);

  // Update the label mapping to properly handle legal_document
  const labelMapping = {
    business_and_trust_accounts: "Business and Trust Accounts",
    checking_and_savings_accounts: "Checking and Savings Accounts",
    accounts_for_minors: "Accounts for Minors",
    important_legal_documents: "Important Legal Documents",
    legal_document: "Important Legal Documents",
    taxable_investment: "Taxable Investment",
    retirement: "Retirement",
    insurance: "Insurance",
  };

  const mappedLabel = labelMapping[internalKey];
  console.log("Mapped label:", mappedLabel);

  const options = mappedLabel ? optionsDataWithOther[mappedLabel] : null;
  console.log("Options found for", mappedLabel, ":", options);

  if (options) {
    return { accountLabel: mappedLabel, options };
  } else {
    console.log("No options found for:", accountLabel);
    return { accountLabel: "", options: [] };
  }
}

// Modify getBypassProbate to handle the new account type
function getBypassProbate(accountType, registrationType, hasBeneficiary) {
  if (registrationType === "Other") {
    return hasBeneficiary;
  }

  const option = optionsDataWithOther[accountType]?.find(
    (opt) => opt.text === registrationType
  );
  if (!option) return false;

  switch (accountType) {
    case "Retirement":
    case "Insurance":
      return hasBeneficiary;
    case "Accounts for Minors":
      return hasBeneficiary;
    case "Business and Trust Accounts":
      return true;
    case "Important Legal Documents":
      return "N/A";
    case "Taxable Investment":
      return option.bypassProbate || false;
    case "Checking and Savings Accounts":
      return option.bypassProbate || false;
    default:
      return false;
  }
}

// Define the base fields structure
const baseFields = {
  fields: [
    {
      name: "registration",
      type: "select",
      placeholder: "Select Registration Type",
      class: "full-width",
    },
    {
      name: "otherRegistration",
      placeholder: function (accountType) {
        return (
          otherRegistrationPlaceholders[accountType] ||
          "Other Registration Type"
        );
      },
      class: "full-width hidden",
    },
    {
      name: "title",
      placeholder: "Title Placeholder",
      class: "full-width",
    },
    {
      name: "companyName",
      placeholder: "Company Name Placeholder",
      class: "half-width",
    },
    {
      name: "accountNumber",
      placeholder: "Last 4 Digits of Account Number",
      class: "half-width",
      type: "text",
      maskInput: true,
    },
    {
      name: "advisorName",
      placeholder: "Advisor Name",
      class: "half-width",
    },
    {
      name: "advisorPhoneNumber",
      placeholder: "Advisor Phone Number",
      type: "tel",
      pattern: "[0-9]{3}-[0-9]{3}-[0-9]{4}",
      title: "XXX-XXX-XXXX",
      class: "half-width",
    },
    {
      name: "value",
      placeholder: "Value Placeholder",
      class: "full-width",
    },
    {
      name: "beneficiaryLabel",
      type: "label",
      text: "Is there a beneficiary?",
      class: "half-width beneficiaryLabel",
    },
    {
      name: "beneficiaryYN",
      type: "fancyRadio",
      options: ["Yes", "No"],
      class: "half-width",
      optionClasses: ["yes-class", "no-class"],
    },
    {
      name: "beneficiaryName",
      placeholder: "Beneficiary Name",
      class: "half-width hidden",
    },
    {
      name: "beneficiaryPhoneNumber",
      placeholder: "Beneficiary Phone Number",
      type: "tel",
      pattern: "[0-9]{3}-[0-9]{3}-[0-9]{4}",
      title: "XXX-XXX-XXXX",
      class: "half-width hidden",
    },
  ],
  uiText: {
    rowLabel: "Document",
  },
};

// Customize for accountFields
const accountFields = JSON.parse(JSON.stringify(baseFields));
accountFields.fields[2].placeholder = "Account Title";
accountFields.fields[3].placeholder = "Firm Name";
accountFields.fields[4].placeholder = "Last 4 Digits of Account Number";
accountFields.fields[7].placeholder = "Account Value";
accountFields.uiText.rowLabel = "Account";
accountFields.fields.find((f) => f.name === "otherRegistration").placeholder =
  otherRegistrationPlaceholders["Taxable Investment"];

// Customize for accountforminor
const accountforminor = JSON.parse(JSON.stringify(baseFields));
accountforminor.fields[2].placeholder = "Account Title (Include Minor's Name)";
accountforminor.fields[3].placeholder = "Firm Name";
accountforminor.fields[4].placeholder = "Last 4 Digits of Account Number";
accountforminor.fields[7].placeholder = "Account Value";
accountforminor.fields[8].text = "Is there a Successor Custodian/Owner?";
accountforminor.fields[10].placeholder = "Successor Custodian/Owner Name";
accountforminor.fields[11].placeholder =
  "Successor Custodian/Owner Phone Number";
accountforminor.uiText.rowLabel = "Account";
accountforminor.fields.find((f) => f.name === "otherRegistration").placeholder =
  otherRegistrationPlaceholders["Taxable Investment"];

// Customize for insuranceFields
const insuranceFields = JSON.parse(JSON.stringify(baseFields));
insuranceFields.fields[2].placeholder = "Policy Title";
insuranceFields.fields[3].placeholder = "Insurance Company Name";
insuranceFields.fields[4].placeholder =
  "Last 4 Digits of Policy/Account Number";
insuranceFields.fields[5].placeholder = "Agent Name";
insuranceFields.fields[6].placeholder = "Agent Phone Number";
insuranceFields.fields[7].placeholder = "Policy Cash Value ($0 for Term Life)";
insuranceFields.fields.splice(8, 0, {
  name: "value2",
  placeholder: "Death Benefit",
  class: "full-width",
});
insuranceFields.uiText.rowLabel = "Policy";
insuranceFields.fields.find((f) => f.name === "otherRegistration").placeholder =
  otherRegistrationPlaceholders["Insurance"];

// Add this line to change the registration placeholder for insurance
insuranceFields.fields.find((f) => f.name === "registration").placeholder =
  "Select Policy Type";

// Customize for legalDocumentFields
const legalDocumentFields = JSON.parse(JSON.stringify(baseFields));
legalDocumentFields.fields.splice(2, 0, {
  name: "documentName",
  placeholder: "Document Title",
  class: "half-width",
});
// Change the placeholder for the registration field
legalDocumentFields.fields.find((f) => f.name === "registration").placeholder =
  "Select Document Type";
legalDocumentFields.fields[3].placeholder = "Document Location";
legalDocumentFields.fields[3].class = "half-width";
legalDocumentFields.fields[4].placeholder = "Attorney/CPA Name";
legalDocumentFields.fields[5].placeholder = "Attorney/CPA Phone Number";
legalDocumentFields.fields[5].type = "tel";
legalDocumentFields.fields[5].pattern = "[0-9]{3}-[0-9]{3}-[0-9]{4}";
legalDocumentFields.fields[5].title = "XXX-XXX-XXXX";
legalDocumentFields.fields[6].placeholder = "Executor/Trustee Name";
legalDocumentFields.fields[7].placeholder = "Executor/Trustee Phone Number";
legalDocumentFields.fields[7].type = "tel";
legalDocumentFields.fields[7].pattern = "[0-9]{3}-[0-9]{3}-[0-9]{4}";
legalDocumentFields.fields[7].title = "XXX-XXX-XXXX";
legalDocumentFields.fields[8].class = "hidden"; // Hide the value field
legalDocumentFields.fields[9].class = "hidden"; // Hide beneficiaryLabel
legalDocumentFields.fields[10].class = "hidden"; // Hide beneficiaryYN
legalDocumentFields.fields[11].class = "hidden"; // Hide beneficiaryName
legalDocumentFields.fields[12].class = "hidden"; // Hide beneficiaryPhoneNumber
legalDocumentFields.uiText.rowLabel = "Important Legal Document";
legalDocumentFields.fields.find(
  (f) => f.name === "accountNumber"
).maskInput = false;
legalDocumentFields.fields.find(
  (f) => f.name === "otherRegistration"
).placeholder = otherRegistrationPlaceholders["Important Legal Documents"];

// Create checkingSavingsFields
const checkingSavingsFields = JSON.parse(JSON.stringify(baseFields));
checkingSavingsFields.fields = checkingSavingsFields.fields.filter((field) =>
  [
    "registration",
    "otherRegistration",
    "title",
    "companyName",
    "accountNumber",
    "beneficiaryLabel",
    "beneficiaryYN",
    "beneficiaryName",
    "beneficiaryPhoneNumber",
  ].includes(field.name)
);
checkingSavingsFields.fields[2].placeholder = "Account Title";
checkingSavingsFields.fields[3].placeholder = "Bank Name";
checkingSavingsFields.fields[4].placeholder = "Last 4 Digits of Account Number";
checkingSavingsFields.uiText.rowLabel = "Checking/Savings Account";
checkingSavingsFields.fields.find(
  (f) => f.name === "otherRegistration"
).placeholder = otherRegistrationPlaceholders["Checking and Savings Accounts"];

function initializeWidgetSettings() {
  console.log("Initializing widget settings...");

  window.widgetSettingsMapping = {
    account: accountFields,
    insurance: insuranceFields,
    legal_document: legalDocumentFields,
    accounts_for_minors: accountforminor,
    taxable_investment: accountFields,
    retirement: accountFields,
    business_and_trust_accounts: accountFields,
    important_legal_documents: legalDocumentFields,
    checking_and_savings_accounts: checkingSavingsFields,
  };

  console.log(
    "Widget settings mapping initialized:",
    Object.keys(window.widgetSettingsMapping)
  );
  console.log("Full widget settings mapping:", window.widgetSettingsMapping);
}

// Call this function when the script loads
initializeWidgetSettings();
console.log("options.js execution completed");
