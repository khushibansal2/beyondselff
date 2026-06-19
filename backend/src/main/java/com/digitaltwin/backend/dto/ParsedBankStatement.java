package com.digitaltwin.backend.dto;

import java.util.List;

public class ParsedBankStatement {

    private String accountHolder;
    private String period;
    private List<Transaction> transactions;

    public static class Transaction {
        private String date;
        private String description;
        private Double amount;
        private String category;
        private String type; // "debit" or "credit"
        private String merchant;

        public String getDate() { return date; }
        public void setDate(String date) { this.date = date; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public Double getAmount() { return amount; }
        public void setAmount(Double amount) { this.amount = amount; }
        public String getCategory() { return category; }
        public void setCategory(String category) { this.category = category; }
        public String getType() { return type; }
        public void setType(String type) { this.type = type; }
        public String getMerchant() { return merchant; }
        public void setMerchant(String merchant) { this.merchant = merchant; }
    }

    public String getAccountHolder() { return accountHolder; }
    public void setAccountHolder(String accountHolder) { this.accountHolder = accountHolder; }
    public String getPeriod() { return period; }
    public void setPeriod(String period) { this.period = period; }
    public List<Transaction> getTransactions() { return transactions; }
    public void setTransactions(List<Transaction> transactions) { this.transactions = transactions; }
}
