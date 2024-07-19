const rawResponse = inputData.rawResponse;

const regex = /\{"accounts":\[\{.*?\}\]\}/g;
let match;
let jsonData = [];

while ((match = regex.exec(rawResponse)) !== null) {
	jsonData.push(match[0]);
}

const customLabels = {
	rowIndex: "#",
	accountType: "Account Type",
	registration: "Registration",
	title: "Account Title",
	companyName: "Firm Name",
	accountNumber: "Account Number",
	advisorName: "Advisor Name",
	advisorPhoneNumber: "Advisor Phone",
	value: "Account Value",
	beneficiaryYN: "Has Beneficiary?",
	beneficiaryName: "Beneficiary Name",
	beneficiaryPhoneNumber: "Beneficiary Phone",
	bypassProbate: "Bypass Probate",
};

const customInsuranceLabels = {
	...customLabels,
	accountNumber: "Policy Number",
	advisorName: "Policy Name",
	advisorPhoneNumber: "Agent Phone",
	value: "Policy Value",
};

const legalDocumentLabels = {
	...customLabels,
	title: "Document Location",
	companyName: "Attorney/CPA Name",
	accountNumber: "Attorney/CPA Phone",
	advisorName: "Executor/Trustee Name",
	advisorPhoneNumber: "Executor/Trustee Phone",
	value: "",
	beneficiaryYN: "",
	beneficiaryName: "",
	beneficiaryPhoneNumber: "",
	bypassProbate: "",
};

const thirdExecutorLabels = {
	rowIndex: "",
	accountType: "Third Executor",
	registration: "Third Executor Name",
	title: "Third Executor Email",
	companyName: "",
	accountNumber: "",
	advisorName: "",
	advisorPhoneNumber: "",
	value: "",
	beneficiaryYN: "",
	beneficiaryName: "",
	beneficiaryPhoneNumber: "",
	bypassProbate: "",
};

let groupedData = Object.keys(customLabels).reduce((acc, key) => {
	acc[key] = [];
	return acc;
}, {});

function addLabelsForNewType(type) {
	if (!groupedData.accountType.includes(type)) {
		const labels = type === "Insurance" ? customInsuranceLabels : type === "Important Legal Document" ? legalDocumentLabels : type === "Third Executor" ? thirdExecutorLabels : customLabels;
		Object.keys(groupedData).forEach((key) => {
			groupedData[key].push(labels[key] || "");
		});
	}
}

function addEmptyRow() {
	Object.keys(groupedData).forEach((key) => {
		groupedData[key].push(key === "rowIndex" ? "~" : "");
	});
}

function addTwoEmptyRows() {
	addEmptyRow();
	addEmptyRow();
}

let isFirstAccount = true;

jsonData.forEach((data) => {
	let parsedData = JSON.parse(data);
	parsedData.accounts.forEach((account, accIndex) => {
		if (!isFirstAccount) {
			addLabelsForNewType(account.accountType);
		}

		Object.keys(groupedData).forEach((key) => {
			let value = account[key];
			if (key === "bypassProbate") {
				if (account.accountType === "Important Legal Document") {
					value = "";
				} else {
					value = account[key] === false ? inputData.unchecked : account[key] === true ? inputData.checked : "";
				}
			} else if (account.accountType === "Important Legal Document" && (key === "value" || key.startsWith("beneficiary"))) {
				value = "";
			} else {
				value = account[key] || "";
			}
			groupedData[key].push(value);
		});

		if (accIndex === parsedData.accounts.length - 1) {
			addTwoEmptyRows();
		}

		isFirstAccount = false;
	});
});

// Extract Third Executor information from rawResponse
const thirdExecutorRegex = /Third Executor Name:([^,]+), Third Executor Email:([^,\s]+)/;
const thirdExecutorMatch = rawResponse.match(thirdExecutorRegex);

// Add Third Executor information
addLabelsForNewType("Third Executor");
groupedData.rowIndex.push("");
groupedData.accountType.push("");
groupedData.registration.push(thirdExecutorMatch ? thirdExecutorMatch[1].trim() : "");
groupedData.title.push(thirdExecutorMatch ? thirdExecutorMatch[2].trim() : "");
Object.keys(groupedData).forEach((key) => {
	if (!["rowIndex", "accountType", "registration", "title"].includes(key)) {
		groupedData[key].push("");
	}
});

const dataArray = groupedData.rowIndex.map((_, index) => {
	return Object.keys(groupedData).reduce((acc, key) => {
		acc[key] = groupedData[key][index];
		return acc;
	}, {});
});

return { dataArray };
