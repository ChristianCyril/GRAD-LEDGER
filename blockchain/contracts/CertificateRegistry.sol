// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CertificateRegistry {

    address public immutable owner;

    struct Certificate {
        string  certHash;
        address issuedBy;
        uint256 issuedAt;
        bool    isRevoked;
    }

    mapping(string => Certificate) private certificates;

    event CertificateIssued(string indexed certId, string certHash, address issuedBy);
    event CertificateRevoked(string indexed certId, address revokedBy);
    event CertificateUnrevoked(string indexed certId, address unrevokedBy);

    // ── Access control ────────────────────────────────────────────────────────

    constructor() {
        owner = msg.sender; // whoever deploys the contract becomes the owner
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not authorised");
        _;
    }

    // ── Functions ─────────────────────────────────────────────────────────────

    function issueCertificate(string memory certId, string memory certHash) public onlyOwner {
        require(bytes(certificates[certId].certHash).length == 0, "Certificate already exists");
        certificates[certId] = Certificate(certHash, msg.sender, block.timestamp, false);
        emit CertificateIssued(certId, certHash, msg.sender);
    }

    function revokeCertificate(string memory certId) public onlyOwner {
        require(bytes(certificates[certId].certHash).length != 0, "Certificate not found");
        require(!certificates[certId].isRevoked, "Certificate already revoked");
        certificates[certId].isRevoked = true;
        emit CertificateRevoked(certId, msg.sender);
    }

    function unrevokeCertificate(string memory certId) public onlyOwner {
        require(bytes(certificates[certId].certHash).length != 0, "Certificate not found");
        require(certificates[certId].isRevoked, "Certificate is not revoked");
        certificates[certId].isRevoked = false;
        emit CertificateUnrevoked(certId, msg.sender);
    }

    // verifyCertificate remains public — anyone can verify
    function verifyCertificate(string memory certId)
        public view
        returns (bool exists, bool isRevoked, string memory certHash, uint256 issuedAt)
    {
        Certificate memory cert = certificates[certId];
        if (bytes(cert.certHash).length == 0) return (false, false, "", 0);
        return (true, cert.isRevoked, cert.certHash, cert.issuedAt);
    }
}