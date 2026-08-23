-- Annule sql/nettoyage_fuseaux_herites.sql.
-- Toutes les valeurs effacées valaient 'Europe/Paris'.
BEGIN;
UPDATE push_subscriptions SET timezone = 'Europe/Paris'
WHERE id IN (
    '676fce40-1b4e-4007-8ef1-f46e4e12ced0',
    'a4363485-59fa-4bb0-94c1-49a028c46de8',
    '4a03c766-5299-4073-82ee-6615d5b609b3',
    '8a6c190e-085e-4a28-8e6c-1f6ce5802a9b',
    '1c781626-593a-4d09-9be0-03edcce66253',
    '0b4ab933-6d63-428e-a84a-1d7900b684c8',
    '36938ce3-3019-442d-ac16-eebfd505a1a4',
    '81852805-a336-4535-8374-2bfc1f2ae28e',
    '1ef5f5c9-f1b2-4b33-8b8c-82058ef4101c',
    '996dd216-e3d3-44f6-b5cd-3538e64bbb04',
    'c1675fed-8561-4668-be0e-06b225b3bd4f',
    'c35b00a2-1c4d-4cd7-8f3b-c6fc5c2c0b59',
    '3a2e3579-e2a0-4763-acc1-7401e3b52399',
    'aa6291e4-644d-4f4e-bf6e-a456e544f664',
    'cbf79f72-6c21-4c9d-86da-525c6ceeaae6',
    'e451dd1c-c6a3-4b0b-9edb-813e58afdc30',
    '13359e10-2355-4654-93f4-77142de9a668',
    'd1821c08-596a-40c2-b936-69419114bda0',
    'de692b61-6229-4e13-bf2c-74cad953c0c6',
    '61e74dd9-ef00-43ad-9f8d-dd4161da2a83',
    '07d8fc94-fae1-4831-ab0f-b8bfb4c775c1',
    '42303cc1-e668-4e7f-9f6a-8cb1422708d5',
    'e624a2b9-ee79-474b-8857-48a182dde6e8',
    '1ce7027b-6f6a-4811-af08-fa9f41d729bd',
    'abbca8e0-307e-4e14-a3fe-ca791a7b3813',
    '2e578c68-7ef4-414c-85d7-86fc541bebb2',
    '45343da7-2832-41c3-9b11-dcdc8233b499'
);
UPDATE user_profiles SET timezone = 'Europe/Paris'
WHERE user_id IN (
    '13524c8e-3ab3-4ad6-b05e-fa03d34242fe',
    '1905352a-20b3-4a31-8777-f55c0fa193ae',
    '3ea17ef1-1a7f-40dd-bcdd-217a65551275',
    '4877d8c0-7554-4031-af76-bd3dcddec69a',
    '66233988-385f-4eff-ac80-824f8ee22bed',
    '7295d766-80e0-4685-9ccf-53875b9e7f84',
    '7d8be53a-a471-4e31-a9ee-0469f1475a0a',
    '86c68cf7-c336-489c-b46a-46568a4e80c8',
    '886cf3fa-0189-477f-aa8c-9fa18dca936d',
    '98655d11-0ade-450c-8069-aecf97e3e050',
    '9dfe8973-b8de-459f-8293-12e6b750fade',
    'a092ee9a-1d16-4a88-b143-0280f5f764cd',
    'abee4f5b-68bc-41c0-82f0-12f464112123',
    'd0063dff-f9df-41cb-ba68-ae836e7f9ab5',
    'd2226a9d-97c4-40cc-a7b3-97e3f5bf056b',
    'd48dd368-46f2-43cd-85b7-913f095aee19',
    'd5ab8126-9eba-4a8d-9513-7a2d7fe2ef52',
    'd7f5a831-4abb-4e09-8458-c7b83e2c6072',
    'de2b21a8-a3b7-4cc0-bf27-88fc28c504dd',
    'e6172d87-3380-4997-99e4-3e41f71c1846',
    'f9dfffd4-68c9-4d62-bda6-6c1d8d1ce27a',
    'dc6256fe-9f46-4c26-bd2f-55a27d347787'
);
COMMIT;
