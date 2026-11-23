/**
 * Program IDL in camelCase format in order to be used in JS/TS.
 *
 * Note that this is only a type helper and is not the actual IDL. The original
 * IDL can be found at `target/idl/blindside.json`.
 */
export type Blindside = {
  "address": "G3KohYDjCbTwQ6nfsR9MWBJjBkwmM1xGMiAc4J4uGJMQ",
  "metadata": {
    "name": "blindside",
    "version": "0.1.0",
    "spec": "0.1.0",
    "description": "Created with Anchor"
  },
  "instructions": [
    {
      "name": "claim",
      "docs": [
        "Pay a player's call out to their balance. Anyone can call it."
      ],
      "discriminator": [
        62,
        198,
        214,
        193,
        213,
        159,
        108,
        210
      ],
      "accounts": [
        {
          "name": "slot",
          "writable": true
        },
        {
          "name": "player",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player.owner",
                "account": "player"
              }
            ]
          }
        }
      ],
      "args": []
    },
    {
      "name": "consumeRandomness",
      "docs": [
        "VRF callback: fixes the hidden close inside the private slot."
      ],
      "discriminator": [
        190,
        217,
        49,
        162,
        99,
        26,
        73,
        234
      ],
      "accounts": [
        {
          "name": "vrfProgramIdentity",
          "docs": [
            "Scoped VRF identity PDA, bound to this program. Its presence as a signer proves",
            "the callback was issued by the VRF program for this program."
          ],
          "signer": true
        },
        {
          "name": "slot",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "randomness",
          "type": {
            "array": [
              "u8",
              32
            ]
          }
        }
      ]
    },
    {
      "name": "delegatePlayer",
      "docs": [
        "Hand the player's balance (and, the first time, its permission) to",
        "the TEE validator so calls can be made there."
      ],
      "discriminator": [
        235,
        159,
        245,
        102,
        161,
        199,
        254,
        89
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "bufferPlayer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                223,
                119,
                186,
                131,
                126,
                44,
                126,
                107,
                10,
                97,
                96,
                215,
                61,
                41,
                112,
                116,
                238,
                221,
                195,
                192,
                248,
                15,
                168,
                242,
                129,
                110,
                44,
                19,
                123,
                234,
                223,
                59
              ]
            }
          }
        },
        {
          "name": "delegationRecordPlayer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataPlayer",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "player"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "player",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "permission",
          "writable": true
        },
        {
          "name": "permissionBuffer",
          "writable": true
        },
        {
          "name": "permissionRecord",
          "writable": true
        },
        {
          "name": "permissionMetadata",
          "writable": true
        },
        {
          "name": "permissionProgram",
          "address": "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1"
        },
        {
          "name": "validator",
          "address": "MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo"
        },
        {
          "name": "ownerProgram",
          "address": "G3KohYDjCbTwQ6nfsR9MWBJjBkwmM1xGMiAc4J4uGJMQ"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "delegateSlot",
      "docs": [
        "Hand a slot and its permission to the TEE validator."
      ],
      "discriminator": [
        156,
        156,
        126,
        176,
        152,
        51,
        15,
        85
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "bufferSlot",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "slot"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                223,
                119,
                186,
                131,
                126,
                44,
                126,
                107,
                10,
                97,
                96,
                215,
                61,
                41,
                112,
                116,
                238,
                221,
                195,
                192,
                248,
                15,
                168,
                242,
                129,
                110,
                44,
                19,
                123,
                234,
                223,
                59
              ]
            }
          }
        },
        {
          "name": "delegationRecordSlot",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110
                ]
              },
              {
                "kind": "account",
                "path": "slot"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "delegationMetadataSlot",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  105,
                  111,
                  110,
                  45,
                  109,
                  101,
                  116,
                  97,
                  100,
                  97,
                  116,
                  97
                ]
              },
              {
                "kind": "account",
                "path": "slot"
              }
            ],
            "program": {
              "kind": "account",
              "path": "delegationProgram"
            }
          }
        },
        {
          "name": "slot",
          "writable": true
        },
        {
          "name": "permission",
          "writable": true
        },
        {
          "name": "permissionBuffer",
          "writable": true
        },
        {
          "name": "permissionRecord",
          "writable": true
        },
        {
          "name": "permissionMetadata",
          "writable": true
        },
        {
          "name": "permissionProgram",
          "address": "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1"
        },
        {
          "name": "validator",
          "address": "MTEWGuqxUpYZGFJQcp8tLN7x5v9BSeoFHYWQQ3n3xzo"
        },
        {
          "name": "ownerProgram",
          "address": "G3KohYDjCbTwQ6nfsR9MWBJjBkwmM1xGMiAc4J4uGJMQ"
        },
        {
          "name": "delegationProgram",
          "address": "DELeGGvXpWV2fqJUhqcF5ZSYMS4JTLjteaAMARRSaeSh"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u8"
        }
      ]
    },
    {
      "name": "deposit",
      "docs": [
        "Move test USDC from the wallet into the game. Base layer, while the",
        "player account isn't delegated."
      ],
      "discriminator": [
        242,
        35,
        198,
        137,
        82,
        225,
        242,
        182
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "player",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "userAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "faucet",
      "docs": [
        "100 test USDC, once an hour per wallet."
      ],
      "discriminator": [
        0,
        98,
        59,
        30,
        144,
        142,
        113,
        12
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true
        },
        {
          "name": "userAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "drip",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  100,
                  114,
                  105,
                  112
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "associatedTokenProgram",
          "address": "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "initSlot",
      "docs": [
        "Create a round slot and a permission with no readers."
      ],
      "discriminator": [
        197,
        55,
        186,
        36,
        93,
        96,
        225,
        37
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true,
          "relations": [
            "config"
          ]
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "slot",
          "writable": true
        },
        {
          "name": "permission",
          "writable": true
        },
        {
          "name": "permissionProgram",
          "address": "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "index",
          "type": "u8"
        }
      ]
    },
    {
      "name": "initialize",
      "docs": [
        "One-time setup: config, test-USDC mint and the vault."
      ],
      "discriminator": [
        175,
        175,
        109,
        31,
        13,
        152,
        155,
        237
      ],
      "accounts": [
        {
          "name": "admin",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "mint",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  109,
                  105,
                  110,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "vault",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  118,
                  97,
                  117,
                  108,
                  116
                ]
              }
            ]
          }
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "join",
      "docs": [
        "Create the player's balance account; only the player can read it."
      ],
      "discriminator": [
        206,
        55,
        2,
        106,
        113,
        220,
        17,
        163
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "player",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "permission",
          "writable": true
        },
        {
          "name": "permissionProgram",
          "address": "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "leave",
      "docs": [
        "Bring the player's balance back to the base layer so it can be withdrawn."
      ],
      "discriminator": [
        59,
        234,
        148,
        108,
        107,
        149,
        173,
        112
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "player",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "magicProgram",
          "address": "Magic11111111111111111111111111111111111111"
        },
        {
          "name": "magicContext",
          "writable": true,
          "address": "MagicContext1111111111111111111111111111111"
        }
      ],
      "args": []
    },
    {
      "name": "openRound",
      "docs": [
        "Start a round in its slot (make it private again if it was revealed)",
        "and ask MagicBlock VRF for the hidden close."
      ],
      "discriminator": [
        66,
        235,
        123,
        240,
        8,
        35,
        185,
        159
      ],
      "accounts": [
        {
          "name": "payer",
          "writable": true,
          "signer": true
        },
        {
          "name": "slot",
          "writable": true
        },
        {
          "name": "permission",
          "writable": true
        },
        {
          "name": "permissionProgram",
          "address": "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1"
        },
        {
          "name": "oracleQueue",
          "writable": true,
          "address": "5hBR571xnXppuCPveTrctfTU7tJLSN94nq7kv7FRK5Tc"
        },
        {
          "name": "programIdentity",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  105,
                  100,
                  101,
                  110,
                  116,
                  105,
                  116,
                  121
                ]
              }
            ]
          }
        },
        {
          "name": "vrfProgram",
          "address": "Vrf1RNUjXmQGjmQrQLvJHs9SNkvDJEsRVFPkfSQUwGz"
        },
        {
          "name": "slotHashes",
          "address": "SysvarS1otHashes111111111111111111111111111"
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "round",
          "type": "u64"
        },
        {
          "name": "clientSeed",
          "type": "u8"
        }
      ]
    },
    {
      "name": "placeCall",
      "docs": [
        "Make a call. Debits the stake now; late calls are refunded at the reveal."
      ],
      "discriminator": [
        11,
        8,
        17,
        8,
        195,
        166,
        211,
        69
      ],
      "accounts": [
        {
          "name": "user",
          "signer": true
        },
        {
          "name": "player",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "slot",
          "writable": true
        }
      ],
      "args": [
        {
          "name": "round",
          "type": "u64"
        },
        {
          "name": "side",
          "type": "u8"
        },
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    },
    {
      "name": "processUndelegation",
      "discriminator": [
        196,
        28,
        41,
        206,
        48,
        37,
        51,
        167
      ],
      "accounts": [
        {
          "name": "baseAccount",
          "writable": true
        },
        {
          "name": "buffer",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  117,
                  110,
                  100,
                  101,
                  108,
                  101,
                  103,
                  97,
                  116,
                  101,
                  45,
                  98,
                  117,
                  102,
                  102,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "baseAccount"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                181,
                183,
                0,
                225,
                242,
                87,
                58,
                192,
                204,
                6,
                34,
                1,
                52,
                74,
                207,
                151,
                184,
                53,
                6,
                235,
                140,
                229,
                25,
                152,
                204,
                98,
                126,
                24,
                147,
                128,
                167,
                62
              ]
            }
          }
        },
        {
          "name": "payer",
          "writable": true
        },
        {
          "name": "systemProgram",
          "address": "11111111111111111111111111111111"
        }
      ],
      "args": [
        {
          "name": "accountSeeds",
          "type": {
            "vec": "bytes"
          }
        }
      ]
    },
    {
      "name": "reveal",
      "docs": [
        "At 80 s: decide the outcome and make the whole round public."
      ],
      "discriminator": [
        9,
        35,
        59,
        190,
        167,
        249,
        76,
        115
      ],
      "accounts": [
        {
          "name": "slot",
          "writable": true
        },
        {
          "name": "permission",
          "writable": true
        },
        {
          "name": "permissionProgram",
          "address": "ACLseoPoyC3cBqoUtkbjZ4aDrkurZW86v19pXz2XQnp1"
        }
      ],
      "args": []
    },
    {
      "name": "tick",
      "docs": [
        "Steady-rate keeper call: records the starting and result prices at",
        "the right moments. Always succeeds."
      ],
      "discriminator": [
        92,
        79,
        44,
        8,
        101,
        80,
        63,
        15
      ],
      "accounts": [
        {
          "name": "slot",
          "writable": true
        },
        {
          "name": "feed",
          "address": "ENYwebBThHzmzwPLAQvCucUTsjyfBSZdD9ViXksS4jPu"
        }
      ],
      "args": []
    },
    {
      "name": "withdraw",
      "docs": [
        "Move test USDC back to the wallet. Base layer, after `leave`."
      ],
      "discriminator": [
        183,
        18,
        70,
        156,
        148,
        109,
        161,
        34
      ],
      "accounts": [
        {
          "name": "user",
          "writable": true,
          "signer": true
        },
        {
          "name": "config",
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  99,
                  111,
                  110,
                  102,
                  105,
                  103
                ]
              }
            ]
          }
        },
        {
          "name": "player",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "const",
                "value": [
                  112,
                  108,
                  97,
                  121,
                  101,
                  114
                ]
              },
              {
                "kind": "account",
                "path": "user"
              }
            ]
          }
        },
        {
          "name": "mint"
        },
        {
          "name": "userAta",
          "writable": true,
          "pda": {
            "seeds": [
              {
                "kind": "account",
                "path": "user"
              },
              {
                "kind": "const",
                "value": [
                  6,
                  221,
                  246,
                  225,
                  215,
                  101,
                  161,
                  147,
                  217,
                  203,
                  225,
                  70,
                  206,
                  235,
                  121,
                  172,
                  28,
                  180,
                  133,
                  237,
                  95,
                  91,
                  55,
                  145,
                  58,
                  140,
                  245,
                  133,
                  126,
                  255,
                  0,
                  169
                ]
              },
              {
                "kind": "account",
                "path": "mint"
              }
            ],
            "program": {
              "kind": "const",
              "value": [
                140,
                151,
                37,
                143,
                78,
                36,
                137,
                241,
                187,
                61,
                16,
                41,
                20,
                142,
                13,
                131,
                11,
                90,
                19,
                153,
                218,
                255,
                16,
                132,
                4,
                142,
                123,
                216,
                219,
                233,
                248,
                89
              ]
            }
          }
        },
        {
          "name": "vault",
          "writable": true
        },
        {
          "name": "tokenProgram",
          "address": "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
        }
      ],
      "args": [
        {
          "name": "amount",
          "type": "u64"
        }
      ]
    }
  ],
  "accounts": [
    {
      "name": "config",
      "discriminator": [
        155,
        12,
        170,
        224,
        30,
        250,
        204,
        130
      ]
    },
    {
      "name": "drip",
      "discriminator": [
        194,
        83,
        22,
        121,
        91,
        124,
        157,
        190
      ]
    },
    {
      "name": "player",
      "discriminator": [
        205,
        222,
        112,
        7,
        165,
        155,
        206,
        218
      ]
    },
    {
      "name": "slot",
      "discriminator": [
        140,
        54,
        3,
        187,
        53,
        189,
        250,
        230
      ]
    }
  ],
  "errors": [
    {
      "code": 6000,
      "name": "wrongSlot",
      "msg": "Slot index doesn't match this round"
    },
    {
      "code": 6001,
      "name": "openWindowClosed",
      "msg": "This round can't be opened yet, or it's too late to open it"
    },
    {
      "code": 6002,
      "name": "slotBusy",
      "msg": "The previous round in this slot isn't finished"
    },
    {
      "code": 6003,
      "name": "roundNotNewer",
      "msg": "Rounds only move forward"
    },
    {
      "code": 6004,
      "name": "roundNotOpen",
      "msg": "This round isn't open"
    },
    {
      "code": 6005,
      "name": "callsClosed",
      "msg": "Calls for this round haven't opened or have closed"
    },
    {
      "code": 6006,
      "name": "badSide",
      "msg": "Side must be up (1) or down (2)"
    },
    {
      "code": 6007,
      "name": "badStake",
      "msg": "Stake is outside the allowed range"
    },
    {
      "code": 6008,
      "name": "alreadyCalled",
      "msg": "You already made a call this round"
    },
    {
      "code": 6009,
      "name": "roundFull",
      "msg": "This round is full"
    },
    {
      "code": 6010,
      "name": "insufficientBalance",
      "msg": "Not enough balance"
    },
    {
      "code": 6011,
      "name": "revealTooEarly",
      "msg": "It's too early to reveal this round"
    },
    {
      "code": 6012,
      "name": "notRevealed",
      "msg": "This round hasn't been revealed"
    },
    {
      "code": 6013,
      "name": "noCall",
      "msg": "No call from this player in this round"
    },
    {
      "code": 6014,
      "name": "alreadyClaimed",
      "msg": "Already paid out"
    },
    {
      "code": 6015,
      "name": "pendingCalls",
      "msg": "Settle your open calls before moving funds"
    },
    {
      "code": 6016,
      "name": "badFeed",
      "msg": "Wrong price feed account"
    },
    {
      "code": 6017,
      "name": "faucetCooldown",
      "msg": "The faucet can be used once an hour"
    },
    {
      "code": 6018,
      "name": "overflow",
      "msg": "Arithmetic overflow"
    }
  ],
  "types": [
    {
      "name": "callEntry",
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "player",
            "type": "pubkey"
          },
          {
            "name": "amount",
            "docs": [
              "Stake in test-USDC base units."
            ],
            "type": "u64"
          },
          {
            "name": "side",
            "docs": [
              "UP or DOWN."
            ],
            "type": "u8"
          },
          {
            "name": "late",
            "docs": [
              "Landed after the secret close: refunded at the reveal, never counted."
            ],
            "type": "bool"
          },
          {
            "name": "claimed",
            "type": "bool"
          }
        ]
      }
    },
    {
      "name": "config",
      "docs": [
        "Program-wide settings. Base layer, never delegated."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "admin",
            "type": "pubkey"
          },
          {
            "name": "mint",
            "docs": [
              "Test USDC mint (authority: this config PDA)."
            ],
            "type": "pubkey"
          },
          {
            "name": "vault",
            "docs": [
              "Token account holding every player's deposits (authority: this config PDA)."
            ],
            "type": "pubkey"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "drip",
      "docs": [
        "Faucet rate limit, one per wallet."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "lastTs",
            "type": "i64"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "player",
      "docs": [
        "A player's in-game balance. Delegated to the private rollup while",
        "playing; only the player can read it."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "owner",
            "type": "pubkey"
          },
          {
            "name": "balance",
            "docs": [
              "Test-USDC base units available to stake."
            ],
            "type": "u64"
          },
          {
            "name": "pending",
            "docs": [
              "Calls not yet paid out. Funds can't leave the rollup while > 0."
            ],
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          }
        ]
      }
    },
    {
      "name": "slot",
      "docs": [
        "One reusable round slot (round % SLOTS). Lives in the Private Ephemeral",
        "Rollup with a permission that has no readers until the reveal, so the",
        "close time, the starting price and the pools stay hidden while it runs."
      ],
      "type": {
        "kind": "struct",
        "fields": [
          {
            "name": "index",
            "type": "u8"
          },
          {
            "name": "bump",
            "type": "u8"
          },
          {
            "name": "round",
            "type": "u64"
          },
          {
            "name": "status",
            "type": "u8"
          },
          {
            "name": "offsetS",
            "docs": [
              "Seconds after the round start when calls stop counting (10..=50)."
            ],
            "type": "u8"
          },
          {
            "name": "vrfReady",
            "type": "bool"
          },
          {
            "name": "outcome",
            "docs": [
              "UP, DOWN, VOID or PENDING."
            ],
            "type": "u8"
          },
          {
            "name": "voidReason",
            "type": "u8"
          },
          {
            "name": "strike",
            "docs": [
              "Starting price (raw feed units, 1e-8 USD) and when it was recorded."
            ],
            "type": "i64"
          },
          {
            "name": "strikeTs",
            "type": "i64"
          },
          {
            "name": "settle",
            "docs": [
              "Result price, recorded 30 s after the strike."
            ],
            "type": "i64"
          },
          {
            "name": "settleTs",
            "type": "i64"
          },
          {
            "name": "upPool",
            "docs": [
              "Counted (on-time) stakes per side."
            ],
            "type": "u64"
          },
          {
            "name": "downPool",
            "type": "u64"
          },
          {
            "name": "callCount",
            "type": "u8"
          },
          {
            "name": "claimedCount",
            "type": "u8"
          },
          {
            "name": "calls",
            "type": {
              "array": [
                {
                  "defined": {
                    "name": "callEntry"
                  }
                },
                48
              ]
            }
          }
        ]
      }
    }
  ]
};
